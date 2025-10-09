const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// Supabase configuration
const SUPABASE_URL = 'https://apqrjkobktjcyrxhqwtm.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcXJqa29ia3RqY3lyeGhxd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTI4NzUsImV4cCI6MjA2Njk2ODg3NX0.99HhMrWfMStRH1p607RjOt6ChklI0iBjg8AGk_QUSbw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global variable for QR code
let currentQRCode = null;

// Create client instance
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './whatsapp-session-default',
        clientId: 'whatsapp-client-default'
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
    console.log('QR Code received, generating terminal output...');
    console.log('QR Code length:', qr.length);
    qrcode.generate(qr, { small: true });
    currentQRCode = qr;
    
    // Salvar QR Code no Supabase
    try {
        const result = await supabase
            .from('whatsapp_config')
            .upsert({
                id: 'default',
                qr_code: qr,
                is_connected: false,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'id'
            });
        
        if (result.error) {
            console.error('Supabase error:', result.error);
        } else {
            console.log('QR Code saved to Supabase successfully');
        }
    } catch (error) {
        console.error('Failed to save QR Code to Supabase:', error);
    }
    
    // QR code expires after 45 seconds, prepare for refresh
    setTimeout(() => {
        console.log('QR Code should refresh soon...');
    }, 45000);
});

// WhatsApp client is ready
client.on('ready', async () => {
    console.log('WhatsApp client is ready!');
    
    // Atualizar status de conexão no Supabase
    try {
        const connectedNumber = client.info?.wid?.user || 'unknown';
        await supabase
            .from('whatsapp_config')
            .update({
                is_connected: true,
                connected_number: connectedNumber,
                qr_code: null,
                last_connection_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', 'default');
        console.log(`WhatsApp connected with number: ${connectedNumber}`);
    } catch (error) {
        console.error('Failed to update connection status in Supabase:', error);
    }
});

// Handle disconnection
client.on('disconnected', async (reason) => {
    console.log('WhatsApp client disconnected:', reason);
    currentQRCode = null;
    
    // Atualizar status no Supabase
    try {
        await supabase
            .from('whatsapp_config')
            .update({
                is_connected: false,
                connected_number: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', 'default');
        console.log('Disconnection status updated in Supabase');
    } catch (error) {
        console.error('Failed to update disconnection status in Supabase:', error);
    }
});

// Handle authentication failure
client.on('auth_failure', async (msg) => {
    console.error('Authentication failed:', msg);
    currentQRCode = null;
    
    // Limpar sessão e forçar novo QR
    try {
        await supabase
            .from('whatsapp_config')
            .update({
                is_connected: false,
                connected_number: null,
                qr_code: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', 'default');
        console.log('Authentication failure status updated in Supabase');
    } catch (error) {
        console.error('Failed to update auth failure status in Supabase:', error);
    }
});

// Listen for incoming messages
client.on('message', async (message) => {
    console.log(`Message received from ${message.from}: ${message.body}`);

    // Forward message to Supabase Edge Function
    try {
        await axios.post(`${SUPABASE_URL}/functions/v1/whatsapp-webhook`, {
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
        console.log('Message forwarded to Supabase webhook');
    } catch (error) {
        console.error('Failed to forward message to Supabase webhook:', error);
    }
});

// API endpoint to get QR code and connection status
app.get('/qr-code', (req, res) => {
    res.json({
        qrCode: currentQRCode,
        isConnected: client.info?.wid !== undefined
    });
});

// API endpoint to get connection status
app.get('/status', (req, res) => {
    res.json({
        isConnected: client.info?.wid !== undefined,
        connectedNumber: client.info?.wid?.user || null,
        clientState: client.getState()
    });
});

// API endpoint to force new QR code
app.post('/reset-session', async (req, res) => {
    try {
        console.log('Forcing session reset...');
        await client.destroy();
        
        // Clear QR code in Supabase
        await supabase
            .from('whatsapp_config')
            .update({
                is_connected: false,
                qr_code: null,
                connected_number: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', 'default');
        
        currentQRCode = null;
        
        // Restart client
        setTimeout(() => {
            client.initialize();
        }, 2000);
        
        res.json({ success: true, message: 'Session reset, new QR code will be generated' });
    } catch (error) {
        console.error('Failed to reset session:', error);
        res.status(500).json({ error: 'Failed to reset session' });
    }
});

// API endpoint to disconnect WhatsApp
app.post('/disconnect', async (req, res) => {
    try {
        await client.logout();
        res.json({ success: true, message: 'WhatsApp disconnected successfully' });
    } catch (error) {
        console.error('Failed to disconnect WhatsApp:', error);
        res.status(500).json({ success: false, error: 'Failed to disconnect WhatsApp' });
    }
});

// API endpoint to send messages
app.post('/send-message', async (req, res) => {
    const { phoneNumber, message } = req.body;

    try {
        // Ensure phone number format is correct
        const formattedNumber = phoneNumber.includes('@c.us') ? phoneNumber : `${phoneNumber}@c.us`;
        await client.sendMessage(formattedNumber, message);
        res.status(200).json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('Failed to send message:', error);
        res.status(500).json({ success: false, error: 'Failed to send message' });
    }
});

// Start Express server
const PORT = 3005;
app.listen(PORT, () => {
    console.log(`WhatsApp service is running on http://localhost:${PORT}`);
});

// Start WhatsApp client
client.initialize();