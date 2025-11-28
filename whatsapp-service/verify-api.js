const axios = require('axios');

const BASE_URL = 'http://127.0.0.1:3005';
const INSTANCE_ID = 'test-uuid-12345678-1234-1234-1234-123456789abc';

async function testService() {
    try {
        console.log('1. Creating instance...');
        try {
            const createRes = await axios.post(`${BASE_URL}/instances`, {
                instanceId: INSTANCE_ID
            });
            console.log('Create response:', createRes.data);
        } catch (e) {
            console.log('Create error (might already exist):', e.response?.data || e.message);
        }

        console.log('\n2. Waiting for QR code generation (60s)...');
        await new Promise(resolve => setTimeout(resolve, 60000));

        console.log('\n3. Fetching QR code...');
        const qrRes = await axios.get(`${BASE_URL}/instances/${INSTANCE_ID}/qr`);
        console.log('QR Response:', qrRes.data);

        if (qrRes.data.qrCode) {
            console.log('✅ QR Code successfully generated!');
        } else {
            console.log('❌ QR Code not found yet.');
        }

        console.log('\n4. Checking status...');
        const statusRes = await axios.get(`${BASE_URL}/instances/${INSTANCE_ID}/status`);
        console.log('Status Response:', statusRes.data);

    } catch (error) {
        console.error('Test failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testService();
