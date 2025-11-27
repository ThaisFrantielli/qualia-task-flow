// Simplified WhatsApp service for testing
const express = require('express');
const cors = require('cors');

const app = express();

// Configure CORS to allow all origins
app.use(cors({
    origin: true, // Allow all origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['*']
}));

// Handle preflight requests
app.options('*', cors());

// Add security headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    next();
});

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
    console.log(`🚀 WhatsApp Test Service running on http://localhost:${PORT}`);
    console.log(`✅ CORS enabled for all origins`);
});