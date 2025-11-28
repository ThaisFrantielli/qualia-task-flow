const axios = require('axios');

async function testBackend() {
    const instanceId = 'test-debug-' + Date.now();
    console.log(`Testing with instance ID: ${instanceId}`);

    try {
        // 1. Create Instance
        console.log('Creating instance...');
        await axios.post('http://localhost:3005/instances', {
            id: instanceId,
            name: 'Debug Instance'
        });
        console.log('Instance creation request sent.');

        // 2. Poll for QR Code
        console.log('Polling for QR Code...');
        for (let i = 0; i < 20; i++) {
            const response = await axios.get(`http://localhost:3005/instances/${instanceId}/qr`);
            const qr = response.data.qrCode;

            if (qr) {
                console.log('SUCCESS: QR Code received!');
                console.log(qr.substring(0, 50) + '...');
                return;
            }

            console.log(`Attempt ${i + 1}: No QR code yet...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        console.log('TIMEOUT: QR Code never appeared.');

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testBackend();
