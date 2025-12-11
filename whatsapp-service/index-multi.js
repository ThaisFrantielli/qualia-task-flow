require('dotenv').config();
const winston = require('winston');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const puppeteerLib = require('puppeteer');
const qrcode = require('qrcode-terminal');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Logger (winston)
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'whatsapp-error.log', level: 'error' }),
        new winston.transports.File({ filename: 'whatsapp-combined.log' }),
        new winston.transports.Console({ format: winston.format.simple() })
    ]
});

// Redirect console to logger for structured logs
console.log = (...args) => logger.info(args.map(a => (typeof a === 'object' ? JSON.stringify(a, Object.getOwnPropertyNames(a)) : String(a))).join(' '));
console.info = console.log;
console.warn = (...args) => logger.warn(args.map(a => (typeof a === 'object' ? JSON.stringify(a, Object.getOwnPropertyNames(a)) : String(a))).join(' '));
console.error = (...args) => logger.error(args.map(a => (typeof a === 'object' ? JSON.stringify(a, Object.getOwnPropertyNames(a)) : String(a))).join(' '));

// Serve static assets
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}
app.use(express.static(publicDir));

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://apqrjkobktjcyrxhqwtm.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
    throw new Error('SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY environment variable is required. Check whatsapp-service/.env');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Multiple WhatsApp instances management
const whatsappInstances = new Map();
const activeQRCodes = new Map();

function resolveBrowserExecutable() {
    const candidates = [
        process.env.PUPPETEER_EXECUTABLE_PATH,
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
    ].filter(Boolean);
    for (const p of candidates) {
        try {
            if (p && fs.existsSync(p)) return p;
        } catch {}
    }
    try {
        return puppeteerLib.executablePath();
    } catch {
        return undefined;
    }
}

const BROWSER_PATH = resolveBrowserExecutable();
console.log(`Using browser executable: ${BROWSER_PATH || 'default (puppeteer)'}`);

async function restoreActiveInstances() {
    try {
        const { data: instances, error } = await supabase
            .from('whatsapp_instances')
            .select('id, name, status')
            .in('status', ['connected', 'connecting']);

        if (error) {
            throw error;
        }

        for (const instance of instances || []) {
            if (whatsappInstances.has(instance.id)) {
                continue;
            }

            console.log(`Restoring WhatsApp instance ${instance.name || instance.id}`);

            const client = createWhatsAppClient(instance.id, instance.name);
            whatsappInstances.set(instance.id, client);

            try {
                await supabase
                    .from('whatsapp_instances')
                    .update({
                        status: 'connecting',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', instance.id);
            } catch (updateError) {
                console.error(`Failed to update status while restoring ${instance.id}:`, updateError);
            }

            client.initialize().catch((e) => {
                console.error(`Failed to initialize client during restore for ${instance.id}`, e);
            });
        }
    } catch (error) {
        console.error('Failed to restore WhatsApp instances on startup:', error);
    }
}

// Subscribe to outgoing messages
function subscribeToOutgoingMessages() {
    console.log('========================================');
    console.log('SUBSCRIBING TO OUTGOING MESSAGES...');
    console.log('========================================');
    const channel = supabase
        .channel('whatsapp-outgoing')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'whatsapp_messages',
                filter: 'status=eq.pending'
            },
            async (payload) => {
                console.log('========================================');
                console.log('NEW OUTGOING MESSAGE DETECTED!');
                console.log('Message ID:', payload.new.id);
                console.log('Instance ID:', payload.new.instance_id);
                console.log('Content:', payload.new.content);
                console.log('Media URL:', payload.new.media_url);
                console.log('========================================');
                const msg = payload.new;
                
                try {
                    const client = whatsappInstances.get(msg.instance_id);
                    if (!client) {
                        console.error(`Instance ${msg.instance_id} not found for message ${msg.id}`);
                        await updateMessageStatus(msg.id, 'failed', 'Instance not found');
                        return;
                    }

                    if (!client.info || !client.info.wid) {
                        console.error(`Instance ${msg.instance_id} not connected for message ${msg.id}`);
                        await updateMessageStatus(msg.id, 'failed', 'Instance not connected');
                        return;
                    }

                    // Format phone number
                    // Assuming msg.conversation_id links to a conversation which has the phone number, 
                    // BUT the message table itself doesn't have the phone number usually?
                    // Wait, the Edge Function was passing phoneNumber.
                    // The whatsapp_messages table usually stores content, but maybe not the recipient phone if it's linked to conversation.
                    // We need to fetch the conversation to get the phone number.
                    
                    const { data: conversation, error: convError } = await supabase
                        .from('whatsapp_conversations')
                        .select('customer_phone, whatsapp_number')
                        .eq('id', msg.conversation_id)
                        .single();

                    if (convError || !conversation) {
                        console.error(`Conversation ${msg.conversation_id} not found for message ${msg.id}`);
                        await updateMessageStatus(msg.id, 'failed', 'Conversation not found');
                        return;
                    }

                    const phoneNumber = conversation.customer_phone;
                    const formattedNumber = phoneNumber.includes('@c.us') ? phoneNumber : `${phoneNumber}@c.us`;

                    console.log(`Sending message ${msg.id} to ${formattedNumber} via instance ${msg.instance_id}`);

                    if (msg.media_url) {
                        const media = await MessageMedia.fromUrl(msg.media_url);
                        if (msg.file_name) media.filename = msg.file_name;
                        await client.sendMessage(formattedNumber, media, { caption: msg.content });
                    } else {
                        await client.sendMessage(formattedNumber, msg.content);
                    }

                    await updateMessageStatus(msg.id, 'sent');
                    console.log(`Message ${msg.id} sent successfully`);

                } catch (error) {
                    console.error(`Failed to send message ${msg.id}:`, error);
                    await updateMessageStatus(msg.id, 'failed', error.message);
                }
            }
        )
        .subscribe((status) => {
            console.log('========================================');
            console.log('SUBSCRIPTION STATUS:', status);
            console.log('========================================');
            if (status === 'SUBSCRIBED') {
                console.log('✅ Successfully subscribed to outgoing messages!');
            } else if (status === 'CHANNEL_ERROR') {
                console.error('❌ Channel error - subscription failed');
            } else if (status === 'TIMED_OUT') {
                console.error('⏱️ Subscription timed out');
            } else if (status === 'CLOSED') {
                console.warn('🔒 Subscription closed');
            }
        });
}

async function updateMessageStatus(messageId, status, errorMessage = null) {
    try {
        await supabase
            .from('whatsapp_messages')
            .update({ 
                status: status,
                error_message: errorMessage, // Assuming this column exists or we ignore it if not
                updated_at: new Date().toISOString()
            })
            .eq('id', messageId);
    } catch (error) {
        console.error(`Failed to update message status for ${messageId}:`, error);
    }
}

// Function to create a new WhatsApp client instance
function createWhatsAppClient(instanceId, instanceName = null) {
    // Sanitize instanceId for use in file paths and clientId (remove hyphens from UUIDs)
    const sanitizedId = instanceId.replace(/-/g, '');
    console.log(`Sanitized ID for LocalAuth: ${sanitizedId}`);

    const client = new Client({
        authStrategy: new LocalAuth({
            dataPath: `./whatsapp-session-${sanitizedId}`
        }),
        // webVersionCache: {
        //     type: 'local'
        // },
        // takeoverOnConflict: true,
        // authTimeoutMs: 120000,
        puppeteer: {
            headless: true,
            executablePath: BROWSER_PATH,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        },
        // qrMaxRetries: 10,
        // restartOnAuthFail: false
    });

    client.on('loading_screen', (percent, message) => {
        console.log(`Instance ${instanceId} loading ${percent}% - ${message}`);
    });

    client.on('change_state', (state) => {
        console.log(`Instance ${instanceId} state changed: ${state}`);
    });

    // Generate QR code for WhatsApp login
    client.on('qr', async (qr) => {
        console.log(`QR Code received for instance ${instanceId}`);

        // Generate terminal QR code with instance identifier
        console.log(`=== QR CODE FOR INSTANCE ${instanceId} ===`);
        qrcode.generate(qr, { small: true });
        console.log(`=== END QR CODE FOR INSTANCE ${instanceId} ===`);

        activeQRCodes.set(instanceId, qr);

        // Save QR Code to Supabase
        try {
            const upsertData = {
                id: instanceId,
                qr_code: qr,
                status: 'connecting',
                updated_at: new Date().toISOString()
            };

            if (instanceName) {
                upsertData.name = instanceName;
            }

            const result = await supabase
                .from('whatsapp_instances')
                .upsert(upsertData, {
                    onConflict: 'id'
                });

            if (result.error) {
                console.error(`Supabase error for instance ${instanceId}:`, result.error);
            } else {
                console.log(`QR Code saved to Supabase successfully for instance ${instanceId}`);
            }
        } catch (error) {
            console.error(`Failed to save QR Code to Supabase for instance ${instanceId}:`, error);
        }
    });

    client.on('authenticated', () => {
        console.log(`Instance ${instanceId} authenticated event fired`);
    });

    // WhatsApp client is ready
    client.on('ready', async () => {
        console.log(`WhatsApp client is ready for instance ${instanceId}!`);

        // Update connection status in Supabase
        try {
            const connectedNumber = client.info?.wid?.user || 'unknown';
            await supabase
                .from('whatsapp_instances')
                .update({
                    status: 'connected',
                    phone_number: connectedNumber,
                    qr_code: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', instanceId);
            console.log(`WhatsApp connected with number: ${connectedNumber} for instance ${instanceId}`);

            // Remove QR code from active list
            activeQRCodes.delete(instanceId);
        } catch (error) {
            console.error(`Failed to update connection status in Supabase for instance ${instanceId}:`, error);
        }
    });

    // Handle disconnection
    client.on('disconnected', async (reason) => {
        console.log(`WhatsApp client disconnected for instance ${instanceId}:`, reason);
        activeQRCodes.delete(instanceId);

        // Update status in Supabase
        try {
            await supabase
                .from('whatsapp_instances')
                .update({
                    status: 'reconnecting',
                    phone_number: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', instanceId);
            console.log(`Disconnection status updated in Supabase for instance ${instanceId}`);
        } catch (error) {
            console.error(`Failed to update disconnection status in Supabase for instance ${instanceId}:`, error);
        }

        // Reconnection Logic
        console.log(`Attempting to reconnect instance ${instanceId} in 5 seconds...`);
        setTimeout(async () => {
            try {
                // Destroy old client if it exists
                if (whatsappInstances.has(instanceId)) {
                    const oldClient = whatsappInstances.get(instanceId);
                    try { await oldClient.destroy(); } catch (e) { console.error('Error destroying old client:', e); }
                    whatsappInstances.delete(instanceId);
                }

                // Create and initialize new client
                console.log(`Recreating client for instance ${instanceId}...`);
                const newClient = createWhatsAppClient(instanceId, instanceName);
                whatsappInstances.set(instanceId, newClient);
                
                newClient.initialize().catch(e => {
                    console.error(`Failed to re-initialize client for ${instanceId}:`, e);
                });
            } catch (err) {
                console.error(`Critical error during reconnection for ${instanceId}:`, err);
            }
        }, 5000);
    });

    // Handle authentication failure
    client.on('auth_failure', async (msg) => {
        console.error(`Authentication failed for instance ${instanceId}:`, msg);
        activeQRCodes.delete(instanceId);

        // Clear session and force new QR
        try {
            await supabase
                .from('whatsapp_instances')
                .update({
                    status: 'disconnected',
                    phone_number: null,
                    qr_code: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', instanceId);
            console.log(`Authentication failure status updated in Supabase for instance ${instanceId}`);
        } catch (error) {
            console.error(`Failed to update auth failure status in Supabase for instance ${instanceId}:`, error);
        }
    });

    // Listen for incoming messages
    client.on('message', async (message) => {
            // TEMPORARILY DISABLED: webhook forwarding causing infinite loop
            console.log(`⚠️ Message received from ${message.from} but forwarding is DISABLED to prevent loop`);
            return;
            
            /* ORIGINAL CODE - RE-ENABLE AFTER FIXING WEBHOOK LOOP
            console.log(`Message received from ${message.from} on instance ${instanceId}: ${message.body}`);

            // Skip empty or whitespace-only messages (these cause validation 400s in the webhook)
            if (!message.body || String(message.body).trim() === '') {
                console.log(`Skipping empty-body message from ${message.from} on instance ${instanceId}`);
                return;
            }

            // Skip messages sent by this instance (avoid echo/loop)
            try {
                const instanceNumber = client?.info?.wid?.user;
                if (instanceNumber && String(message.from).includes(String(instanceNumber))) {
                    console.log(`Skipping message from self (${message.from}) on instance ${instanceId}`);
                    return;
                }
            } catch (e) {
                console.error('Error checking instance number for self-skip:', e);
            }

            // Deduplication: check if message was already processed (by whatsapp_message_id)
            try {
                const { data: existing, error: existError } = await supabase
                    .from('whatsapp_messages')
                    .select('id')
                    .eq('whatsapp_message_id', message.id._serialized)
                    .limit(1);

                if (existError) {
                    console.error('Error checking existing whatsapp_message_id before forwarding:', existError);
                } else if (existing && existing.length > 0) {
                    console.log(`Message ${message.id._serialized} already exists in whatsapp_messages, skipping forward.`);
                    return;
                }
            } catch (err) {
                console.error('Unexpected error during dedup check:', err);
            }

            // Forward message to Supabase Edge Function
            try {
                await axios.post(`${SUPABASE_URL}/functions/v1/whatsapp-webhook`, {
                    instance_id: instanceId,
                    from: message.from,
                    body: message.body,
                    timestamp: message.timestamp,
                    type: message.type,
                    messageId: message.id._serialized
                }, {
                    headers: {
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'Content-Type': 'application/json'
                    }
                });
                console.log(`Message forwarded to Supabase webhook for instance ${instanceId}`);
            } catch (error) {
                // Improve error logging so we can see status and response body from the Edge Function
                if (error && error.response) {
                    try {
                        console.error(`Failed to forward message to Supabase webhook for instance ${instanceId}: status=${error.response.status}, data=${JSON.stringify(error.response.data)}`);
                    } catch (e) {
                        console.error(`Failed to forward message to Supabase webhook for instance ${instanceId}: response status=${error.response.status}`);
                    }
                } else {
                    console.error(`Failed to forward message to Supabase webhook for instance ${instanceId}:`, error);
                }
            }
            */
    });

    return client;
}

// Removed default instance initialization - instances are now created on-demand via API

// API Endpoints

// Get all instances
app.get('/instances', async (req, res) => {
    try {
        const { data: dbInstances, error } = await supabase
            .from('whatsapp_instances')
            .select('*');

        if (error) throw error;

        const instances = dbInstances.map(inst => {
            const client = whatsappInstances.get(inst.id);
            const isConnected = client?.info?.wid !== undefined;
            const hasQRCode = activeQRCodes.has(inst.id);
            
            return {
                instanceId: inst.id,
                isConnected: isConnected || inst.status === 'connected',
                connectedNumber: inst.phone_number,
                hasQRCode: hasQRCode || (inst.qr_code !== null && inst.status !== 'connected')
            };
        });

        res.json({ instances });
    } catch (error) {
        console.error('Failed to fetch instances:', error);
        res.status(500).json({ error: 'Failed to fetch instances' });
    }
});

// Reset/Restart instance
app.post('/instances/:instanceId/reset', async (req, res) => {
    try {
        const { instanceId } = req.params;
        console.log(`Resetting instance ${instanceId}...`);

        // 1. Disconnect if exists
        if (whatsappInstances.has(instanceId)) {
            const client = whatsappInstances.get(instanceId);
            try {
                await client.destroy();
            } catch (e) {
                console.error(`Error destroying client ${instanceId}:`, e);
            }
            whatsappInstances.delete(instanceId);
            activeQRCodes.delete(instanceId);
        }

        // 2. Create new
        const client = createWhatsAppClient(instanceId);
        whatsappInstances.set(instanceId, client);
        
        client.initialize().catch(e => console.error(`Failed to re-initialize ${instanceId}:`, e));

        res.json({ success: true, message: `Instance ${instanceId} reset` });
    } catch (error) {
        console.error('Failed to reset instance:', error);
        res.status(500).json({ error: 'Failed to reset instance' });
    }
});

// Health check
app.get('/status', (req, res) => {
    res.json({
        online: true,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        activeInstances: whatsappInstances.size
    });
});

// Create new instance
app.post('/instances', async (req, res) => {
    try {
        console.log('POST /instances body:', req.body);
        const { instanceId } = req.body; // Frontend sends instanceId or id

        const id = instanceId || req.body.id;
        const name = req.body.name || `Instance ${id.slice(0, 8)}`;
        console.log('Parsed ID:', id);

        if (!id) {
            return res.status(400).json({ error: 'Instance ID is required' });
        }

        if (whatsappInstances.has(id)) {
            return res.status(400).json({ error: 'Instance already exists' });
        }

        // Create new client instance
        const client = createWhatsAppClient(id, name);
        whatsappInstances.set(id, client);
        
        console.log(`Initializing client for ${id}...`);
        client.initialize()
            .then(() => console.log(`Client initialization command sent for ${id}`))
            .catch((e) => {
                console.error(`Failed to initialize client for ${id}`, e);
            });

        res.json({
            success: true,
            message: `WhatsApp instance ${id} created successfully`,
            instanceId: id
        });
    } catch (error) {
        console.error('Failed to create instance:', error);
        res.status(500).json({ error: 'Failed to create instance' });
    }
});

// Get QR Code
app.get('/instances/:instanceId/qr', (req, res) => {
    const { instanceId } = req.params;
    const qrCode = activeQRCodes.get(instanceId);
    const client = whatsappInstances.get(instanceId);

    // Frontend expects { qrCode: string }
    res.json({
        instanceId: instanceId,
        qrCode: qrCode,
        isConnected: client ? client.info?.wid !== undefined : false
    });
});

// Get Status
app.get('/instances/:instanceId/status', (req, res) => {
    const { instanceId } = req.params;
    const client = whatsappInstances.get(instanceId);

    if (!client) {
        return res.json({ status: 'disconnected', connected: false });
    }

    res.json({
        instanceId: instanceId,
        status: client.info?.wid !== undefined ? 'connected' : 'connecting',
        connected: client.info?.wid !== undefined,
        phoneNumber: client.info?.wid?.user || null
    });
});

// Detailed health check
app.get('/health', (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        browserPath: BROWSER_PATH || null,
        instances: {
            total: whatsappInstances.size,
            connected: 0,
            connecting: 0,
            disconnected: 0
        },
        memory: {
            usedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            totalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        }
    };

    for (const [id, client] of whatsappInstances.entries()) {
        if (client.info?.wid) {
            health.instances.connected++;
        } else if (activeQRCodes.has(id)) {
            health.instances.connecting++;
        } else {
            health.instances.disconnected++;
        }
    }

    res.json(health);
});

// Disconnect
app.post('/instances/:instanceId/disconnect', async (req, res) => {
    try {
        const { instanceId } = req.params;
        const client = whatsappInstances.get(instanceId);

        if (!client) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        await client.destroy();
        whatsappInstances.delete(instanceId);
        activeQRCodes.delete(instanceId);

        // Update DB
        await supabase
            .from('whatsapp_instances')
            .update({
                status: 'disconnected',
                qr_code: null,
                phone_number: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', instanceId);

        res.json({
            success: true,
            message: `WhatsApp instance ${instanceId} disconnected successfully`
        });
    } catch (error) {
        console.error('Failed to disconnect instance:', error);
        res.status(500).json({ error: 'Failed to disconnect instance' });
    }
});

// Send message (Text or Media)
app.post('/send-message', async (req, res) => {
    try {
        const { instance_id, phoneNumber, message, mediaUrl, mediaType, fileName, conversation_id, message_id } = req.body;
        
        if (!instance_id) return res.status(400).json({ error: 'instance_id is required' });
        if (!phoneNumber) return res.status(400).json({ error: 'phoneNumber is required' });
        
        const client = whatsappInstances.get(instance_id);
        if (!client) return res.status(404).json({ error: 'Instance not found' });
        
        // Check if connected
        if (!client.info || !client.info.wid) {
             return res.status(400).json({ error: 'Instance not connected' });
        }

        const formattedNumber = phoneNumber.includes('@c.us') ? phoneNumber : `${phoneNumber}@c.us`;
        
        let sentMessage;
        
        // Try to get media info from direct params or from message_id lookup
        let actualMediaUrl = mediaUrl;
        let actualFileName = fileName;
        
        if (!actualMediaUrl && message_id) {
            try {
                const { data: msgData } = await supabase
                    .from('whatsapp_messages')
                    .select('metadata, has_media')
                    .eq('id', message_id)
                    .single();
                
                if (msgData?.has_media && msgData?.metadata) {
                    actualMediaUrl = msgData.metadata.media_url;
                    actualFileName = msgData.metadata.file_name;
                }
            } catch (e) {
                console.error('Failed to fetch message metadata:', e);
            }
        }
        
        if (actualMediaUrl) {
            console.log(`Sending media to ${formattedNumber} via instance ${instance_id}`);
            try {
                let media;
                
                // For audio files, send as document to avoid WhatsApp Web audio validation issues
                if (mediaType && mediaType.startsWith('audio/')) {
                    console.log('Processing audio file as document...');
                    
                    // Use fromUrl
                    media = await MessageMedia.fromUrl(actualMediaUrl);
                    if (actualFileName) media.filename = actualFileName;
                    
                    // Force audio mimetype
                    if (media.mimetype.includes('webm') || media.mimetype.includes('ogg')) {
                        media.mimetype = 'audio/ogg; codecs=opus';
                    }
                    
                    console.log(`Audio loaded, size: ${media.data.length} bytes, mimetype: ${media.mimetype}`);
                    
                    // Send as document with audio type (bypasses WhatsApp Web audio validation)
                    sentMessage = await client.sendMessage(formattedNumber, media, { 
                        sendMediaAsDocument: true 
                    });
                    console.log('Audio sent successfully as document');
                } else {
                    // For other media types, use fromUrl as before
                    media = await MessageMedia.fromUrl(actualMediaUrl);
                    if (actualFileName) media.filename = actualFileName;
                    sentMessage = await client.sendMessage(formattedNumber, media, { caption: message || '' });
                }
            } catch (mediaError) {
                console.error('Error sending media, details:', mediaError);
                throw new Error(`Failed to send media: ${mediaError.message}`);
            }
        } else {
            console.log(`Sending text to ${formattedNumber} via instance ${instance_id}`);
            sentMessage = await client.sendMessage(formattedNumber, message);
        }
        
        // Update message status in database if message_id provided
        if (message_id) {
            try {
                await supabase
                    .from('whatsapp_messages')
                    .update({
                        status: 'sent',
                        whatsapp_message_id: sentMessage.id._serialized,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', message_id);
                console.log(`✓ Updated message ${message_id} status to sent`);
            } catch (dbError) {
                console.error('Failed to update message status in DB:', dbError);
                // Don't fail the request if DB update fails - message was sent successfully
            }
        }
        
        res.json({ 
            success: true, 
            whatsapp_message_id: sentMessage.id._serialized,
            timestamp: sentMessage.timestamp 
        });
    } catch (error) {
        console.error('Error sending message:', error);
        
        // Try to mark as failed in DB if message_id provided
        if (req.body.message_id) {
            try {
                await supabase
                    .from('whatsapp_messages')
                    .update({
                        status: 'failed',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', req.body.message_id);
            } catch (dbError) {
                console.error('Failed to mark message as failed in DB:', dbError);
            }
        }
        
        res.status(500).json({ error: error.message });
    }
});

// Start server
const PORT = process.env.PORT || 3007;
app.listen(PORT, () => {
    console.log(`\n✓ Multi-WhatsApp service is running on http://localhost:${PORT}`);
    console.log(`✓ Health check: http://localhost:${PORT}/status`);
    console.log(`✓ Ready to create instances via POST /instances\n`);

    restoreActiveInstances().catch((error) => {
        console.error('Failed to restore instances after startup:', error);
    });
    
    subscribeToOutgoingMessages();

    // POLLING DISABLED: was causing infinite loop resending messages
    console.log('⚠️  Polling fallback is DISABLED to prevent message loops');
});