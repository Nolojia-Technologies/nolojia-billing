/**
 * Test script for Bytewave SMS API
 * Run with: npx ts-node src/test-sms.ts
 */

const BYTEWAVE_API_URL = 'https://portal.bytewavenetworks.com/api/v3';
const BYTEWAVE_API_TOKEN = '86|GhDtjXnfpFsSwJVz7eSmzGzbIDKUSxO5iw00qRN061545cfa';

async function testSmsApi() {
    console.log('Testing Bytewave SMS API...');
    console.log('API URL:', BYTEWAVE_API_URL);
    console.log('Token (first 10 chars):', BYTEWAVE_API_TOKEN.substring(0, 10) + '...');

    const testNumber = '+254712345678'; // Replace with your test number
    const testMessage = 'Test message from Noloji ISP OS';

    // Test the send endpoint
    try {
        console.log('\n--- Testing /sms/send endpoint ---');
        const response = await fetch(`${BYTEWAVE_API_URL}/sms/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${BYTEWAVE_API_TOKEN}`
            },
            body: JSON.stringify({
                to: testNumber,
                message: testMessage,
                sender_id: 'NOLOJI'
            })
        });

        console.log('Response status:', response.status, response.statusText);
        const data = await response.json();
        console.log('Response body:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }

    // Also try the HTTP API endpoint
    try {
        console.log('\n--- Testing HTTP API endpoint ---');
        const httpUrl = 'https://portal.bytewavenetworks.com/api/http';
        const response = await fetch(`${httpUrl}/sms/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${BYTEWAVE_API_TOKEN}`
            },
            body: JSON.stringify({
                to: testNumber,
                message: testMessage,
                sender_id: 'NOLOJI'
            })
        });

        console.log('Response status:', response.status, response.statusText);
        const data = await response.json();
        console.log('Response body:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }

    // Try balance check
    try {
        console.log('\n--- Testing /sms/balance endpoint ---');
        const response = await fetch(`${BYTEWAVE_API_URL}/sms/balance`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${BYTEWAVE_API_TOKEN}`
            }
        });

        console.log('Response status:', response.status, response.statusText);
        const data = await response.json();
        console.log('Response body:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

testSmsApi();
