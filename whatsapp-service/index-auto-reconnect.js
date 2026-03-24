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
const reconnectAttempts = new Map(); // Rastrear tentativas de reconexão
const lastHealthCheck = new Map();
const instanceStates = new Map(); // Rastrear estado das instâncias

// Configurações de reconexão
const RECONNECT_CONFIG = {
    maxRetries: 5,
    initialDelay: 5000, // 5 segundos
    maxDelay: 60000, // 1 minuto
    healthCheckInterval: 300000, // 5 minutos
    autoReconnectEnabled: true
};

console.log(`[STARTUP] WhatsApp Auto-Reconnect Service iniciando...`);
console.log(`[CONFIG] Max Retries: ${RECONNECT_CONFIG.maxRetries}`);
console.log(`[CONFIG] Health Check Interval: ${RECONNECT_CONFIG.healthCheckInterval / 1000}s`);

// Function to create a new WhatsApp client instance with auto-reconnect
function createWhatsAppClient(instanceId) {
    console.log(`[${instanceId}] Starting client creation...`);
    const sessionPath = path.join(__dirname, `whatsapp-session-${instanceId}`);
    console.log(`[${instanceId}] Session path: ${sessionPath}`);

    const client = new Client({
        authStrategy: new LocalAuth({
            clientId: instanceId,
            dataPath: sessionPath
        }),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });

    // Initialize state tracking
    instanceStates.set(instanceId, {
        connected: false,
        lastConnected: null,
        lastDisconnected: null,
        reconnectAttempt: 0,
        totalDisconnections: 0
    });

    // Generate QR code for WhatsApp login
    client.on('qr', async (qr) => {
        console.log(`[${instanceId}] QR Code received! Scan to connect.`);

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
            console.error(`[${instanceId}] Failed to save QR Code:`, error.message);
        }
    });

    // WhatsApp client is ready
    client.on('ready', async () => {
        console.log(`[${instanceId}] ✅ WhatsApp client is READY!`);

        const state = instanceStates.get(instanceId);
        if (state) {
            state.connected = true;
            state.lastConnected = new Date();
            state.reconnectAttempt = 0; // Reset
        }

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

            // Clear reconnect attempts
            reconnectAttempts.delete(instanceId);
            activeQRCodes.delete(instanceId);
        } catch (error) {
            console.error(`[${instanceId}] Failed to update status:`, error.message);
        }
    });

    // Handle disconnection with auto-reconnect
    client.on('disconnected', async (reason) => {
        console.warn(`[${instanceId}] ⚠️ Disconnected. Reason: ${reason}`);

        const state = instanceStates.get(instanceId);
        if (state) {
            state.connected = false;
            state.lastDisconnected = new Date();
            state.totalDisconnections++;
        }

        activeQRCodes.delete(instanceId);

        // Update status in Supabase
        try {
            await supabase
                .from('whatsapp_instances')
                .update({
                    status: 'disconnected',
                    qr_code: null,
                    disconnected_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', instanceId);
        } catch (error) {
            console.error(`[${instanceId}] Failed to update disconnection status:`, error.message);
        }

        // Auto-reconnect se habilitado
        if (RECONNECT_CONFIG.autoReconnectEnabled) {
            scheduleReconnect(instanceId, whatsappInstances.get(instanceId));
        }
    });

    // Handle authentication failure
    client.on('auth_failure', async (msg) => {
        console.error(`[${instanceId}] ❌ Auth failure: ${msg}`);
        activeQRCodes.delete(instanceId);

        try {
            await supabase
                .from('whatsapp_instances')
                .update({
                    status: 'auth_failed',
                    qr_code: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', instanceId);
        } catch (error) {
            console.error(`[${instanceId}] Failed to update auth failure:`, error.message);
        }
    });

    // Listen for incoming messages
    client.on('message', async (message) => {
        // console.log(`[${instanceId}] Message from ${message.from}: ${message.body}`);

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

// Schedule reconnection with exponential backoff
function scheduleReconnect(instanceId, client) {
    if (!client) return;

    const state = instanceStates.get(instanceId);
    const attempts = state?.reconnectAttempt || 0;

    if (attempts >= RECONNECT_CONFIG.maxRetries) {
        console.error(`[${instanceId}] ❌ Max reconnection attempts (${RECONNECT_CONFIG.maxRetries}) reached. Giving up.`);
        return;
    }

    const delay = Math.min(
        RECONNECT_CONFIG.initialDelay * Math.pow(2, attempts),
        RECONNECT_CONFIG.maxDelay
    );

    if (state) {
        state.reconnectAttempt = attempts + 1;
    }

    console.log(`[${instanceId}] 🔄 Scheduling reconnect in ${delay / 1000}s (attempt ${attempts + 1}/${RECONNECT_CONFIG.maxRetries})`);

    setTimeout(() => {
        console.log(`[${instanceId}] 🔄 Attempting to reconnect...`);
        client.initialize().catch(err => {
            console.error(`[${instanceId}] Reconnect failed:`, err.message);
        });
    }, delay);
}

// Health check e auto-reconnect de instâncias desconectadas
async function healthCheck() {
    console.log(`\n[HEALTH-CHECK] Running at ${new Date().toISOString()}`);

    for (const [instanceId, client] of whatsappInstances.entries()) {
        try {
            if (!client) continue;

            const state = client.info;
            const isReady = await client.getState().catch(() => null);
            const instanceState = instanceStates.get(instanceId);

            if (instanceState && !instanceState.connected) {
                console.warn(`[HEALTH-CHECK] ${instanceId}: NOT CONNECTED. Attempting reconnect...`);
                scheduleReconnect(instanceId, client);
            } else if (isReady && state?.wid) {
                console.log(`[HEALTH-CHECK] ${instanceId}: ✅ OK (${state.wid.user})`);
            } else {
                console.warn(`[HEALTH-CHECK] ${instanceId}: ⚠️  UNHEALTHY. State: ${isReady}`);
            }

            lastHealthCheck.set(instanceId, new Date());
        } catch (error) {
            console.error(`[HEALTH-CHECK] ${instanceId} error:`, error.message);
        }
    }

    console.log(`[HEALTH-CHECK] Completed. Active instances: ${whatsappInstances.size}`);
}

// Start health check interval
setInterval(healthCheck, RECONNECT_CONFIG.healthCheckInterval);

// API Endpoints

// Health check endpoint
app.get('/status', (req, res) => {
    const instances = Array.from(whatsappInstances.entries()).map(([id, client]) => {
        const state = instanceStates.get(id);
        return {
            id,
            connected: state?.connected || false,
            lastConnected: state?.lastConnected,
            lastDisconnected: state?.lastDisconnected,
            reconnectAttempts: state?.reconnectAttempt || 0,
            totalDisconnections: state?.totalDisconnections || 0,
            phoneNumber: client?.info?.wid?.user
        };
    });

    res.json({
        online: true,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        activeInstances: whatsappInstances.size,
        autoReconnect: RECONNECT_CONFIG.autoReconnectEnabled,
        instances
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

        console.log(`[API] Creating new instance: ${id}`);
        const client = createWhatsAppClient(id);
        whatsappInstances.set(id, client);
        client.initialize();

        res.json({ success: true, message: `Instance ${id} created` });
    } catch (error) {
        console.error('Create instance error:', error.message);
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
    const state = instanceStates.get(id);

    if (!client) {
        return res.json({ status: 'disconnected', connected: false, state });
    }

    try {
        const clientState = await client.getState().catch(() => null);
        const info = client.info;

        res.json({
            status: clientState || 'unknown',
            connected: info?.wid !== undefined,
            phoneNumber: info?.wid?.user,
            state
        });
    } catch (error) {
        res.json({ status: 'error', error: error.message, state });
    }
});

// Disconnect
app.post('/instances/:id/disconnect', async (req, res) => {
    const { id } = req.params;
    const client = whatsappInstances.get(id);

    if (client) {
        await client.destroy();
        whatsappInstances.delete(id);
        activeQRCodes.delete(id);
        reconnectAttempts.delete(id);
        instanceStates.delete(id);

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

    const state = instanceStates.get(instanceId);
    if (!state?.connected) {
        return res.status(503).json({ error: 'Instance is not connected. Please wait for reconnection.' });
    }

    try {
        const formattedNumber = phoneNumber.includes('@c.us') ? phoneNumber : `${phoneNumber}@c.us`;
        await client.sendMessage(formattedNumber, message);
        res.json({ success: true });
    } catch (error) {
        console.error(`Send message error for ${instanceId}:`, error.message);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Force reconnect endpoint
app.post('/instances/:id/reconnect', async (req, res) => {
    const { id } = req.params;
    const client = whatsappInstances.get(id);

    if (!client) {
        return res.status(404).json({ error: 'Instance not found' });
    }

    console.log(`[API] Force reconnect triggered for ${id}`);
    scheduleReconnect(id, client);

    res.json({ success: true, message: `Reconnect scheduled for ${id}` });
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
    console.log(`\n✅ WhatsApp Auto-Reconnect Service running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/status`);
    console.log(`🔄 Auto-reconnect: ${RECONNECT_CONFIG.autoReconnectEnabled ? 'ENABLED' : 'DISABLED'}`);
    console.log(`⏱️  Health check interval: ${RECONNECT_CONFIG.healthCheckInterval / 1000}s\n`);

    // Run initial health check
    setTimeout(healthCheck, 10000);
});
