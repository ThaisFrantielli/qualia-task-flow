const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

console.log('Initializing standalone WhatsApp client...');

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './test-session'
    }),
    puppeteer: {
        headless: true,
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    }
});

client.on('qr', (qr) => {
    console.log('QR Code received!');
    qrcode.generate(qr, { small: true });
    console.log('Scan the QR code above with your phone.');
});

client.on('ready', () => {
    console.log('Client is ready!');
    process.exit(0);
});

client.on('authenticated', () => {
    console.log('Authenticated!');
});

client.on('auth_failure', (msg) => {
    console.error('AUTHENTICATION FAILURE', msg);
});

client.initialize();
