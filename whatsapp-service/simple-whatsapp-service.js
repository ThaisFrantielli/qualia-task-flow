const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3005;

// Simple status endpoint
app.get('/status', (req, res) => {
    console.log('Status endpoint called');
    res.json({
        isConnected: true,
        connectedNumber: "556192209067",
        clientState: "CONNECTED",
        service: "simple-whatsapp-service",
        timestamp: new Date().toISOString()
    });
});

// QR code endpoint
app.get('/qr-code', (req, res) => {
    console.log('QR Code endpoint called');
    res.json({
        qrCode: "test-qr-code-data",
        isConnected: true
    });
});

// Send message endpoint
app.post('/send-message', (req, res) => {
    const { phoneNumber, message } = req.body;
    console.log(`Sending message to ${phoneNumber}: ${message}`);
    res.json({
        success: true,
        message: "Message sent successfully"
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Simple WhatsApp Service running on http://localhost:${PORT}`);
    console.log(`🚀 Service is ready and accepting connections`);
});

// Handle process termination gracefully
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});