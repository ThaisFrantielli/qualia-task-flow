// Simplified WhatsApp service for testing
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3006;

// Simulated state
let isConnected = true;
const connectedNumber = "556192209067";

// Status endpoint
app.get('/status', (req, res) => {
    res.json({
        isConnected: isConnected,
        connectedNumber: connectedNumber,
        clientState: "CONNECTED"
    });
});

// Send message endpoint
app.post('/send-message', (req, res) => {
    const { phoneNumber, message } = req.body;
    
    res.json({
        success: true,
        message: "Message sent successfully (simulated)"
    });
});

// QR Code endpoint (dummy)
app.get('/qr-code', (req, res) => {
    res.json({
        qrCode: null,
        isConnected: isConnected
    });
});

// Start server
app.listen(PORT, () => {
    // Service started silently
});