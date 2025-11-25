// simple-whatsapp-service.js
// Multi-instance WhatsApp service using Express and a Map to manage client instances.
// This is a minimal implementation for demonstration purposes. In production,
// you would replace the placeholder client with a real WhatsApp Web library
// (e.g., whatsapp-web.js) and handle authentication, QR code generation,
// and message sending accordingly.

const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

// Placeholder WhatsApp client implementation
class MockWhatsAppClient {
    constructor(instanceId) {
        this.instanceId = instanceId;
        this.connected = false;
        this.phoneNumber = null;
    }
    async connect() {
        // Simulate async connection and assign a mock phone number
        this.connected = true;
        this.phoneNumber = '+55' + Math.floor(100000000 + Math.random() * 900000000);
    }
    async disconnect() {
        this.connected = false;
        this.phoneNumber = null;
    }
    async getStatus() {
        return this.connected ? 'connected' : 'disconnected';
    }
    async getQrCode() {
        // Return a placeholder data URL for QR code
        return `data:image/png;base64,${Buffer.from('qr-code-' + this.instanceId).toString('base64')}`;
    }
    async sendMessage(to, message) {
        if (!this.connected) throw new Error('Instance not connected');
        // Simulate sending a message
        console.log(`[Instance ${this.instanceId}] Sending message to ${to}: ${message}`);
        return { success: true, to, message };
    }
}

const app = express();
app.use(bodyParser.json());

// In‑memory store of instances keyed by instance_id
const instances = new Map();

// Create a new WhatsApp instance
app.post('/instances', async (req, res) => {
    const { name } = req.body;
    const instanceId = uuidv4();
    const client = new MockWhatsAppClient(instanceId);
    await client.connect();
    instances.set(instanceId, { client, name, status: await client.getStatus(), phoneNumber: client.phoneNumber });
    res.json({ instanceId, name, status: 'connected', phoneNumber: client.phoneNumber });
});

// Disconnect and remove an instance
app.delete('/instances/:id', async (req, res) => {
    const { id } = req.params;
    const record = instances.get(id);
    if (!record) return res.status(404).json({ error: 'Instance not found' });
    await record.client.disconnect();
    instances.delete(id);
    res.json({ success: true, instanceId: id });
});

// Get status of a specific instance
app.get('/instances/:id/status', async (req, res) => {
    const { id } = req.params;
    const record = instances.get(id);
    if (!record) return res.status(404).json({ error: 'Instance not found' });
    const status = await record.client.getStatus();
    res.json({ instanceId: id, status, phoneNumber: record.client.phoneNumber });
});

// Get QR code for a specific instance (useful when connecting for the first time)
app.get('/instances/:id/qr-code', async (req, res) => {
    const { id } = req.params;
    const record = instances.get(id);
    if (!record) return res.status(404).json({ error: 'Instance not found' });
    const qr = await record.client.getQrCode();
    res.json({ instanceId: id, qrCode: qr });
});

// Send a message via a specific instance
app.post('/send-message/:id', async (req, res) => {
    const { id } = req.params;
    const { phoneNumber, message } = req.body;
    const record = instances.get(id);
    if (!record) return res.status(404).json({ error: 'Instance not found' });
    try {
        const result = await record.client.sendMessage(phoneNumber, message);
        res.json({ success: true, instanceId: id, ...result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', instances: instances.size });
});

const PORT = process.env.PORT || 3006;
app.listen(PORT, () => {
    console.log(`Simple WhatsApp multi‑instance service listening on port ${PORT}`);
});