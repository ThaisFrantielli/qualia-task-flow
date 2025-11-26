
async function testSend() {
    try {
        console.log('Enviando mensagem de teste...');
        const response = await fetch('http://localhost:3005/send-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phoneNumber: '5561996187305',
                message: 'Teste de sistema após correção RLS ' + new Date().toISOString(),
                instance_id: '1de89d6d-ea8e-46ff-a1f3-786a8f2ed47b'
            })
        });

        const data = await response.json();
        console.log('Response:', data);
    } catch (error) {
        console.error('Erro:', error);
    }
}

testSend();
