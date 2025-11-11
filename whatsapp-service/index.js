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

// Serve static assets from ./public (favicon, etc.)
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

// If a favicon doesn't exist, write a tiny default one (1x1 transparent PNG) as favicon.ico
const faviconPath = path.join(publicDir, 'favicon.ico');
if (!fs.existsSync(faviconPath)) {
    // 1x1 transparent PNG base64
    const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
    try {
        fs.writeFileSync(faviconPath, Buffer.from(base64Png, 'base64'));
        console.log('Wrote default favicon to', faviconPath);
    } catch (err) {
        console.error('Failed to write default favicon:', err);
    }
}

app.use(express.static(publicDir));

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
        // Get company WhatsApp number
        const info = await client.info;
        const companyNumber = info.wid.user;
        
        await axios.post(`${SUPABASE_URL}/functions/v1/whatsapp-webhook`, {
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
        console.log('Message forwarded to Supabase webhook with company number:', companyNumber);
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

// Simple HTML page to view QR code in the browser
app.get('/qr-view', (req, res) => {
        if (!currentQRCode) {
                return res.send(`
                        <html>
                            <head><title>WhatsApp QR</title></head>
                            <body style="font-family: sans-serif;">
                                <h3>Nenhum QR Code disponível no momento.</h3>
                                <p>Se o cliente não estiver conectado, aguarde a geração do QR ou faça POST /reset-session.</p>
                            </body>
                        </html>
                `);
        }
        const src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(currentQRCode)}`;
        res.send(`
            <html>
                <head><title>WhatsApp QR</title></head>
                <body style="display:flex;align-items:center;justify-content:center;height:100vh;background:#f7f7f7;font-family:sans-serif;">
                    <div style="text-align:center;background:#fff;padding:20px;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
                        <h3 style="margin:0 0 12px">Escaneie para conectar</h3>
                        <img alt="WhatsApp QR" src="${src}" />
                        <p style="color:#555">Atualize a página se expirar (45s).</p>
                    </div>
                </body>
            </html>
        `);
});

// API endpoint to get connection status
app.get('/status', (req, res) => {
    res.json({
        isConnected: client.info?.wid !== undefined,
        connectedNumber: client.info?.wid?.user || null,
        clientState: client.getState()
    });
});

// Avoid browser requesting favicon and returning 404
// (now served from ./public via express.static)

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

    console.log(`📤 Sending message to ${phoneNumber}`);
    console.log(`Message: ${message}`);
    console.log(`Client ready: ${client.info?.wid?.user || 'Not connected'}`);

    try {
        // Ensure phone number format is correct
        const formattedNumber = phoneNumber.includes('@c.us') ? phoneNumber : `${phoneNumber}@c.us`;
        
        await client.sendMessage(formattedNumber, message);
        console.log(`✅ Message sent successfully to ${formattedNumber}`);
        
        res.status(200).json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('❌ Failed to send message:', error);
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