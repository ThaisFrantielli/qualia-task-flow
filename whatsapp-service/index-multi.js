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

    // Sanitize instanceId for use in file paths and clientId (remove hyphens from UUIDs)
    const sanitizedId = instanceId.replace(/-/g, '');
    console.log(`Sanitized ID for LocalAuth: ${sanitizedId}`);

    const client = new Client({
        authStrategy: new LocalAuth({
            dataPath: `./whatsapp-session-${sanitizedId}`,
            clientId: `whatsapp-client-${sanitizedId}`
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

        // Generate terminal QR code with instance identifier
        console.log(`=== QR CODE FOR INSTANCE ${instanceId} ===`);
        qrcode.generate(qr, { small: true });
        console.log(`=== END QR CODE FOR INSTANCE ${instanceId} ===`);

        activeQRCodes.set(instanceId, qr);

        // Save QR Code to Supabase
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
                console.log(`QR Code saved to Supabase successfully for instance ${instanceId}`);
            }
        } catch (error) {
            console.error(`Failed to save QR Code to Supabase for instance ${instanceId}:`, error);
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
                    status: 'disconnected',
                    phone_number: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', instanceId);
            console.log(`Disconnection status updated in Supabase for instance ${instanceId}`);
        } catch (error) {
            console.error(`Failed to update disconnection status in Supabase for instance ${instanceId}:`, error);
        }
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
        console.log(`Message received from ${message.from} on instance ${instanceId}: ${message.body}`);

        // Forward message to Supabase Edge Function
        try {
            await axios.post(`${SUPABASE_URL}/functions/v1/whatsapp-webhook`, {
                instanceId: instanceId,
                from: message.from,
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
            console.log(`Message forwarded to Supabase webhook for instance ${instanceId}`);
        } catch (error) {
            console.error(`Failed to forward message to Supabase webhook for instance ${instanceId}:`, error);
        }
    });

    return client;
}

// Removed default instance initialization - instances are now created on-demand via API

// API Endpoints

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
        console.log('Parsed ID:', id);

        if (!id) {
            return res.status(400).json({ error: 'Instance ID is required' });
        }

        if (whatsappInstances.has(id)) {
            return res.status(400).json({ error: 'Instance already exists' });
        }

        // Create new client instance
        const client = createWhatsAppClient(id);
        whatsappInstances.set(id, client);
        client.initialize();

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

// Start server
const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
    console.log(`\n✓ Multi-WhatsApp service is running on http://localhost:${PORT}`);
    console.log(`✓ Health check: http://localhost:${PORT}/status`);
    console.log(`✓ Ready to create instances via POST /instances\n`);
});