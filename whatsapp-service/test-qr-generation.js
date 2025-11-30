const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

console.log('🔍 Testing WhatsApp QR Code Generation...\n');

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './test-session'
    }),
    puppeteer: {
        headless: true,
        dumpio: false,
        executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-blink-features=AutomationControlled'
        ]
    },
    qrMaxRetries: 3
});

client.on('qr', (qr) => {
    console.log('\n✅ QR CODE RECEIVED!\n');
    qrcode.generate(qr, { small: true });
    console.log('\nQR Code String Length:', qr.length);
    console.log('First 50 chars:', qr.substring(0, 50));
});

client.on('ready', () => {
    console.log('\n✅ Client is ready!');
    process.exit(0);
});

client.on('auth_failure', (msg) => {
    console.error('\n❌ Auth failure:', msg);
    process.exit(1);
});

client.on('disconnected', (reason) => {
    console.log('\n⚠️ Disconnected:', reason);
    process.exit(1);
});

console.log('⏳ Initializing WhatsApp client...');
client.initialize().catch(err => {
    console.error('\n❌ Initialization error:', err);
    process.exit(1);
});

// Timeout after 60 seconds
setTimeout(() => {
    console.log('\n⏱️ Timeout - QR code not generated within 60 seconds');
    process.exit(1);
}, 60000);
