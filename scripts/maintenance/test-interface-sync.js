// Simple test to verify database connection and message flow
console.log('🔍 Testing message visibility in interface...\n');

// Test 1: Send a message via API and check if it appears
console.log('1️⃣ Sending test message via WhatsApp service...');

const testMessage = `Teste de visibilidade - ${new Date().toLocaleTimeString()}`;

fetch('http://localhost:3005/send-message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phoneNumber: '556192209067',
    message: testMessage
  })
})
.then(response => response.json())
.then(data => {
  console.log('✅ Message sent:', data);
  console.log('\n📱 Check your phone for:', testMessage);
  console.log('\n🖥️ Now check the interface at: http://localhost:8080/clientes');
  console.log('   - Look for "Thais Cabral"');
  console.log('   - Click on WhatsApp tab');
  console.log('   - The message should appear in the conversation');
})
.catch(error => {
  console.error('❌ Error sending message:', error);
});