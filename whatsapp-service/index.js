const { Client, LocalAuth } = require('whatsapp-web.js');
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

// Serve static assets
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}
app.use(express.static(publicDir));

// Supabase configuration
const SUPABASE_URL = 'https://apqrjkobktjcyrxhqwtm.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcXJqa29ia3RqY3lyeGhxd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTI4NzUsImV4cCI6MjA2Njk2ODg3NX0.99HhMrWfMStRH1p607RjOt6ChklI0iBjg8AGk_QUSbw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Multiple WhatsApp instances management
const whatsappInstances = new Map();
const activeQRCodes = new Map();

// Function to create a new WhatsApp client instance
function createWhatsAppClient(instanceId) {
    console.log(`Creating WhatsApp client for instance: ${instanceId}`);

    const client = new Client({
        authStrategy: new LocalAuth({
            dataPath: `./whatsapp-session-${instanceId}`,
            clientId: `whatsapp-client-${instanceId}`
        }),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--disable-extensions',
                '--disable-plugins',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding'
            ]
        },
        qrMaxRetries: 5,
        restartOnAuthFail: false
    });

    // Generate QR code for WhatsApp login
    client.on('qr', async (qr) => {
        console.log(`QR Code received for instance ${instanceId}`);

        // Generate terminal QR code
        qrcode.generate(qr, { small: true });

        activeQRCodes.set(instanceId, qr);

        // Save QR Code to Supabase (whatsapp_instances table)
        try {
            const result = await supabase
                .from('whatsapp_instances')
                .upsert({
                    id: instanceId,
                    qr_code: qr,
                    status: 'connecting',
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'id'
                });

            if (result.error) {
                console.error(`Supabase error for instance ${instanceId}:`, result.error);
            } else {
                console.log(`QR Code saved to Supabase for instance ${instanceId}`);
            }
        } catch (error) {
            console.error(`Failed to save QR Code for instance ${instanceId}:`, error);
        }
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
            console.log(`Instance ${instanceId} connected with number: ${connectedNumber}`);

            activeQRCodes.delete(instanceId);
        } catch (error) {
            console.error(`Failed to update status for instance ${instanceId}:`, error);
        }
    });

    // Handle disconnection
    client.on('disconnected', async (reason) => {
        console.log(`Instance ${instanceId} disconnected:`, reason);
        activeQRCodes.delete(instanceId);

        // Update status in Supabase
        try {
            await supabase
                .from('whatsapp_instances')
                .update({
                    status: 'disconnected',
                    qr_code: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', instanceId);
        } catch (error) {
            console.error(`Failed to update disconnection status for instance ${instanceId}:`, error);
        }
    });

    // Handle authentication failure
    client.on('auth_failure', async (msg) => {
        console.error(`Auth failure for instance ${instanceId}:`, msg);
        activeQRCodes.delete(instanceId);

        try {
            await supabase
                .from('whatsapp_instances')
                .update({
                    status: 'disconnected',
                    qr_code: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', instanceId);
        } catch (error) {
            console.error(`Failed to update auth failure for instance ${instanceId}:`, error);
        }
    });

    // Listen for incoming messages
    client.on('message', async (message) => {
        console.log(`Message received on instance ${instanceId} from ${message.from}`);

        // Forward message to Supabase Edge Function
        try {
            const info = await client.info;
            const companyNumber = info.wid.user;

            await axios.post(`${SUPABASE_URL}/functions/v1/whatsapp-webhook`, {
                instanceId: instanceId, // NEW: Send instance ID
                from: message.from,
                to: companyNumber,
                body: message.body,
                timestamp: message.timestamp,
                type: message.type,
                id: message.id._serialized
            }, {
                headers: {
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log(`Message forwarded to webhook for instance ${instanceId}`);
        } catch (error) {
            console.error(`Failed to forward message for instance ${instanceId}:`, error);
        }
    });

    return client;
}

// Initialize default instance (legacy support or primary instance)
function initializeDefaultInstance() {
    // We use a fixed UUID for the default instance to maintain compatibility
    // Or we can just use 'default' string if the UUID column allows it (it's UUID type, so we need a UUID)
    // Let's assume the user will create instances via UI, but for dev we might want one.
    // For now, let's NOT auto-create a default instance to avoid UUID errors if 'default' string is used.
    // The frontend should drive instance creation.
    console.log('Waiting for instance creation requests...');
}

// API Endpoints

// Create new instance
app.post('/instances', async (req, res) => {
    try {
        const { id, name } = req.body;

        if (!id) return res.status(400).json({ error: 'Instance ID is required' });

        if (whatsappInstances.has(id)) {
            return res.status(400).json({ error: 'Instance already active' });
        }

        const client = createWhatsAppClient(id);
        whatsappInstances.set(id, client);
        client.initialize();

        res.json({ success: true, message: `Instance ${id} created` });
    } catch (error) {
        console.error('Create instance error:', error);
        res.status(500).json({ error: 'Failed to create instance' });
    }
});

// Get QR Code
app.get('/instances/:id/qr', (req, res) => {
    const { id } = req.params;
    const qrCode = activeQRCodes.get(id);
    res.json({ qrCode });
});

// Get Status
app.get('/instances/:id/status', async (req, res) => {
    const { id } = req.params;
    const client = whatsappInstances.get(id);

    if (!client) {
        return res.json({ status: 'disconnected', connected: false });
    }

    const state = await client.getState().catch(() => null);
    const info = client.info;

    res.json({
        status: state || 'unknown',
        connected: info?.wid !== undefined,
        phoneNumber: info?.wid?.user
    });
});

// Disconnect
app.post('/instances/:id/disconnect', async (req, res) => {
    const { id } = req.params;
    const client = whatsappInstances.get(id);

    if (client) {
        await client.destroy();
        whatsappInstances.delete(id);
        activeQRCodes.delete(id);

        // Update DB
        await supabase
            .from('whatsapp_instances')
            .update({ status: 'disconnected', qr_code: null })
            .eq('id', id);

        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Instance not found' });
    }
});

// Send Message
app.post('/send-message/:instanceId', async (req, res) => {
    const { instanceId } = req.params;
    const { phoneNumber, message } = req.body;

    const client = whatsappInstances.get(instanceId);

    if (!client) {
        return res.status(404).json({ error: 'Instance not found or not active' });
    }

    try {
        const formattedNumber = phoneNumber.includes('@c.us') ? phoneNumber : `${phoneNumber}@c.us`;
        await client.sendMessage(formattedNumber, message);
        res.json({ success: true });
    } catch (error) {
        console.error(`Send message error for ${instanceId}:`, error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

const PORT = 3005;
app.listen(PORT, () => {
    console.log(`WhatsApp Multi-Session Service running on port ${PORT}`);
});