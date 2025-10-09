const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

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
        console.log(`QR Code length: ${qr.length}`);
        
        // Generate terminal QR code with instance identifier
        console.log(`=== QR CODE FOR INSTANCE ${instanceId} ===`);
        qrcode.generate(qr, { small: true });
        console.log(`=== END QR CODE FOR INSTANCE ${instanceId} ===`);
        
        activeQRCodes.set(instanceId, qr);
        
        // Save QR Code to Supabase
        try {
            const result = await supabase
                .from('whatsapp_config')
                .upsert({
                    id: instanceId,
                    qr_code: qr,
                    is_connected: false,
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
        
        // QR code expires after 45 seconds, prepare for refresh
        setTimeout(() => {
            console.log(`QR Code should refresh soon for instance ${instanceId}...`);
        }, 45000);
    });

    // WhatsApp client is ready
    client.on('ready', async () => {
        console.log(`WhatsApp client is ready for instance ${instanceId}!`);
        
        // Update connection status in Supabase
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
                .from('whatsapp_config')
                .update({
                    is_connected: false,
                    connected_number: null,
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
                .from('whatsapp_config')
                .update({
                    is_connected: false,
                    connected_number: null,
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

// Initialize default instance
function initializeDefaultInstance() {
    const defaultClient = createWhatsAppClient('default');
    whatsappInstances.set('default', defaultClient);
    defaultClient.initialize();
    console.log('Default WhatsApp instance initialized');
}

// API endpoint to create new WhatsApp instance
app.post('/create-instance', async (req, res) => {
    try {
        const { instanceId } = req.body;
        
        if (!instanceId) {
            return res.status(400).json({ error: 'instanceId is required' });
        }
        
        if (whatsappInstances.has(instanceId)) {
            return res.status(400).json({ error: 'Instance already exists' });
        }
        
        // Create new client instance
        const client = createWhatsAppClient(instanceId);
        whatsappInstances.set(instanceId, client);
        client.initialize();
        
        res.json({ 
            success: true, 
            message: `WhatsApp instance ${instanceId} created successfully`,
            instanceId: instanceId
        });
    } catch (error) {
        console.error('Failed to create instance:', error);
        res.status(500).json({ error: 'Failed to create instance' });
    }
});

// API endpoint to get QR code for specific instance
app.get('/qr-code/:instanceId', (req, res) => {
    const { instanceId } = req.params;
    const qrCode = activeQRCodes.get(instanceId);
    const client = whatsappInstances.get(instanceId);
    
    res.json({
        instanceId: instanceId,
        qrCode: qrCode,
        isConnected: client ? client.info?.wid !== undefined : false
    });
});

// API endpoint to get connection status for specific instance
app.get('/status/:instanceId', (req, res) => {
    const { instanceId } = req.params;
    const client = whatsappInstances.get(instanceId);
    
    if (!client) {
        return res.status(404).json({ error: 'Instance not found' });
    }
    
    res.json({
        instanceId: instanceId,
        isConnected: client.info?.wid !== undefined,
        connectedNumber: client.info?.wid?.user || null,
        clientState: client.getState()
    });
});

// API endpoint to get all instances
app.get('/instances', (req, res) => {
    const instances = Array.from(whatsappInstances.keys()).map(instanceId => {
        const client = whatsappInstances.get(instanceId);
        const qrCode = activeQRCodes.get(instanceId);
        
        return {
            instanceId: instanceId,
            isConnected: client ? client.info?.wid !== undefined : false,
            connectedNumber: client ? client.info?.wid?.user || null : null,
            hasQRCode: !!qrCode
        };
    });
    
    res.json({
        instances: instances,
        total: instances.length
    });
});

// API endpoint to disconnect specific WhatsApp instance
app.post('/disconnect/:instanceId', async (req, res) => {
    try {
        const { instanceId } = req.params;
        const client = whatsappInstances.get(instanceId);
        
        if (!client) {
            return res.status(404).json({ error: 'Instance not found' });
        }
        
        await client.destroy();
        whatsappInstances.delete(instanceId);
        activeQRCodes.delete(instanceId);
        
        res.json({ 
            success: true, 
            message: `WhatsApp instance ${instanceId} disconnected successfully` 
        });
    } catch (error) {
        console.error('Failed to disconnect instance:', error);
        res.status(500).json({ error: 'Failed to disconnect instance' });
    }
});

// API endpoint to reset session for specific instance
app.post('/reset-session/:instanceId', async (req, res) => {
    try {
        const { instanceId } = req.params;
        const client = whatsappInstances.get(instanceId);
        
        if (client) {
            await client.destroy();
        }
        
        // Clear QR code in Supabase
        await supabase
            .from('whatsapp_config')
            .update({
                is_connected: false,
                qr_code: null,
                connected_number: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', instanceId);
        
        activeQRCodes.delete(instanceId);
        whatsappInstances.delete(instanceId);
        
        // Create new instance
        const newClient = createWhatsAppClient(instanceId);
        whatsappInstances.set(instanceId, newClient);
        
        setTimeout(() => {
            newClient.initialize();
        }, 2000);
        
        res.json({ 
            success: true, 
            message: `Session reset for instance ${instanceId}, new QR code will be generated` 
        });
    } catch (error) {
        console.error(`Failed to reset session for instance ${instanceId}:`, error);
        res.status(500).json({ error: 'Failed to reset session' });
    }
});

// Send message through specific instance
app.post('/send-message/:instanceId', async (req, res) => {
    try {
        const { instanceId } = req.params;
        const { to, message } = req.body;
        
        const client = whatsappInstances.get(instanceId);
        
        if (!client) {
            return res.status(404).json({ error: 'Instance not found' });
        }
        
        if (!client.info?.wid) {
            return res.status(400).json({ error: 'Instance not connected' });
        }
        
        await client.sendMessage(to, message);
        res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error(`Failed to send message through instance ${instanceId}:`, error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Start server
const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
    console.log(`Multi-WhatsApp service is running on http://localhost:${PORT}`);
    
    // Initialize default instance on startup
    initializeDefaultInstance();
});