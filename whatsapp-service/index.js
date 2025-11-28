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
    console.log(`[${instanceId}] Starting client creation...`);
    const sessionPath = path.join(__dirname, `whatsapp-session-${instanceId}`);
    console.log(`[${instanceId}] Session path: ${sessionPath}`);

    const client = new Client({
        authStrategy: new LocalAuth({
            dataPath: sessionPath
        }),
        puppeteer: {
            headless: true,
            dumpio: true,
            executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        },
        qrMaxRetries: 5,
        restartOnAuthFail: false
    });

    // Generate QR code for WhatsApp login
    client.on('qr', async (qr) => {
        console.log(`[${instanceId}] QR Code received!`);

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
                console.error(`[${instanceId}] Supabase error saving QR:`, result.error);
            } else {
                console.log(`[${instanceId}] QR Code saved to Supabase`);
            }
        } catch (error) {
            console.error(`[${instanceId}] Failed to save QR Code:`, error);
        }
    });

    // WhatsApp client is ready
    client.on('ready', async () => {
        console.log(`[${instanceId}] WhatsApp client is ready!`);

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
            console.log(`[${instanceId}] Connected with number: ${connectedNumber}`);

            activeQRCodes.delete(instanceId);
        } catch (error) {
            console.error(`[${instanceId}] Failed to update status:`, error);
        }
    });

    // Handle disconnection
    client.on('disconnected', async (reason) => {
        console.log(`[${instanceId}] Disconnected:`, reason);
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
            console.error(`[${instanceId}] Failed to update disconnection status:`, error);
        }
    });

    // Handle authentication failure
    client.on('auth_failure', async (msg) => {
        console.error(`[${instanceId}] Auth failure:`, msg);
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
            console.error(`[${instanceId}] Failed to update auth failure:`, error);
        }
    });

    // Listen for incoming messages
    client.on('message', async (message) => {
        console.log(`[${instanceId}] Message from ${message.from}: ${message.body}`);

        // Forward message to Supabase Edge Function
        try {
            const info = await client.info;
            const companyNumber = info.wid.user;

            await axios.post(`${SUPABASE_URL}/functions/v1/whatsapp-webhook`, {
                instance_id: instanceId,
                from: message.from,
                to: companyNumber,
                body: message.body,
                timestamp: message.timestamp,
                type: message.type,
                messageId: message.id._serialized
            }, {
                headers: {
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log(`[${instanceId}] ✓ Message forwarded to webhook`);
        } catch (error) {
            console.error(`[${instanceId}] ✗ Failed to forward message:`, error.message);
        }
    });

    return client;
}

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
    console.log(`\n✓ WhatsApp Multi-Session Service running on port ${PORT}`);
    console.log(`✓ Health check: http://localhost:${PORT}/status\n`);
});