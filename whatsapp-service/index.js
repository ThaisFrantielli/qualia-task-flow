const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const client = new Client({
    authStrategy: new LocalAuth(),
});

// Generate QR code for WhatsApp login
client.on('qr', (qr) => {
    console.log('QR Code received, generating terminal output...');
    qrcode.generate(qr, { small: true });

    // Temporarily comment out the axios.post call to prevent crash loop
    axios.post('http://localhost:8000/api/whatsapp-webhook/qr-code', { qr })
        .then(() => console.log('QR Code sent to new webhook'))
        .catch((err) => console.error('Failed to send QR Code to new webhook', err));
});

// WhatsApp client is ready
client.on('ready', () => {
    console.log('WhatsApp client is ready!');
});

// Listen for incoming messages
client.on('message', (message) => {
    console.log(`Message received from ${message.from}: ${message.body}`);

    // Forward message to new webhook
    axios.post('http://localhost:8000/api/whatsapp-webhook/messages', {
        from: message.from,
        body: message.body,
    })
        .then(() => console.log('Message forwarded to new webhook'))
        .catch((err) => console.error('Failed to forward message to new webhook', err));
});

// API endpoint to send messages
app.post('/send-message', async (req, res) => {
    const { phoneNumber, message } = req.body;

    try {
        await client.sendMessage(phoneNumber, message);
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