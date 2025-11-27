// Native fetch is available in Node.js 18+

const SERVICE_URL = 'http://localhost:3006';

async function runVerification() {
    console.log('🚀 Starting WhatsApp Multi-Session Verification...');

    try {
        // 1. Check Service Status
        console.log('\n1️⃣ Checking Service Status...');
        const statusRes = await fetch(`${SERVICE_URL}/status`);
        if (!statusRes.ok) throw new Error(`Failed to fetch status: ${statusRes.statusText}`);
        const statusData = await statusRes.json();
        console.log('✅ Service Status:', statusData.status);
        console.log(`📊 Active Instances: ${statusData.instances.length}`);
        statusData.instances.forEach(inst => {
            console.log(`   - [${inst.id}] ${inst.name} (${inst.status}) - ${inst.phone_number || 'No number'}`);
        });

        // 2. List Instances
        console.log('\n2️⃣ Listing Instances Endpoint...');
        const instancesRes = await fetch(`${SERVICE_URL}/instances`);
        if (!instancesRes.ok) throw new Error(`Failed to fetch instances: ${instancesRes.statusText}`);
        const instancesData = await instancesRes.json();
        console.log(`✅ Instances Found: ${instancesData.length}`);

        // 3. Create a Test Instance
        console.log('\n3️⃣ Creating Test Instance...');
        const createRes = await fetch(`${SERVICE_URL}/instances`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ instanceName: 'Test Instance' })
        });
        if (!createRes.ok) throw new Error(`Failed to create instance: ${createRes.statusText}`);
        const createData = await createRes.json();
        const newInstanceId = createData.id;
        console.log(`✅ Created Instance: ${newInstanceId} - ${createData.name}`);

        // 4. Check QR Code for new instance
        console.log('\n4️⃣ Fetching QR Code...');
        const qrRes = await fetch(`${SERVICE_URL}/instances/${newInstanceId}/qr`);
        if (!qrRes.ok) throw new Error(`Failed to fetch QR: ${qrRes.statusText}`);
        const qrData = await qrRes.json();
        console.log(`✅ QR Code Status: ${qrData.status}`);
        if (qrData.qr) console.log('   (QR Code data received)');

        // 5. Delete Test Instance
        console.log('\n5️⃣ Deleting Test Instance...');
        const deleteRes = await fetch(`${SERVICE_URL}/instances/${newInstanceId}`, {
            method: 'DELETE'
        });
        if (!deleteRes.ok) throw new Error(`Failed to delete instance: ${deleteRes.statusText}`);
        const deleteData = await deleteRes.json();
        console.log(`✅ Deleted Instance: ${deleteData.message}`);

        console.log('\n✨ Verification Completed Successfully!');

    } catch (error) {
        console.error('\n❌ Verification Failed:', error.message);
    }
}

runVerification();
