/**
 * Daraja M-Pesa STK Push Test Script
 * 
 * Usage: npx ts-node src/test-stk-push.ts
 * 
 * This script tests the STK Push API endpoint with sandbox credentials.
 */

const TEST_CONFIG = {
    // API endpoint (local dev server)
    apiUrl: 'http://localhost:3000/api/payments/stk-push',

    // Sandbox test phone number (from Safaricom)
    testPhoneNumber: '254708374149',

    // Test amount (minimum 1 KES)
    testAmount: 1,

    // You'll need a valid customer ID from your database
    // Replace this with an actual customer ID
    customerId: 'REPLACE_WITH_ACTUAL_CUSTOMER_ID',
};

async function testSTKPush() {
    console.log('🚀 Testing Daraja STK Push...\n');

    // First, check configuration status
    console.log('📋 Checking configuration...');
    try {
        const configResponse = await fetch(TEST_CONFIG.apiUrl, { method: 'GET' });
        const configData = await configResponse.json();
        console.log('Configuration:', configData);

        if (!configData.configured) {
            console.error('❌ M-Pesa is not configured. Check your .env.local file.');
            console.log('\nRequired environment variables:');
            console.log('  - MPESA_CONSUMER_KEY');
            console.log('  - MPESA_CONSUMER_SECRET');
            console.log('  - MPESA_CALLBACK_URL');
            return;
        }

        if (!configData.hasCallbackUrl) {
            console.error('⚠️  Callback URL not set. M-Pesa will not be able to confirm payments.');
            console.log('Set MPESA_CALLBACK_URL in .env.local with your ngrok URL');
            return;
        }
    } catch (error) {
        console.error('Failed to check configuration:', error);
        return;
    }

    // Initiate STK Push
    console.log('\n📱 Initiating STK Push...');
    console.log(`  Phone: ${TEST_CONFIG.testPhoneNumber}`);
    console.log(`  Amount: KES ${TEST_CONFIG.testAmount}`);
    console.log(`  Customer ID: ${TEST_CONFIG.customerId}`);

    try {
        const response = await fetch(TEST_CONFIG.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                customer_id: TEST_CONFIG.customerId,
                phone_number: TEST_CONFIG.testPhoneNumber,
                amount: TEST_CONFIG.testAmount,
            }),
        });

        const data = await response.json();

        if (data.success) {
            console.log('\n✅ STK Push initiated successfully!');
            console.log('  Checkout Request ID:', data.data.checkout_request_id);
            console.log('  Message:', data.data.customer_message);
            console.log('\n📲 In sandbox mode, the test phone will receive a simulated prompt.');
            console.log('   Check the Safaricom Developer Portal for callback simulation.');

            // Poll for status
            console.log('\n⏳ Polling for payment status...');
            await pollStatus(data.data.checkout_request_id);
        } else {
            console.error('\n❌ STK Push failed:', data.error);
        }
    } catch (error) {
        console.error('\n❌ Error initiating STK Push:', error);
    }
}

async function pollStatus(checkoutRequestId: string) {
    const statusUrl = `http://localhost:3000/api/payments/stk-status?checkout_request_id=${checkoutRequestId}`;

    for (let i = 0; i < 6; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

        try {
            const response = await fetch(statusUrl);
            const data = await response.json();

            console.log(`  Status (${i + 1}/6):`, data.data?.status || 'unknown');

            if (data.data?.status === 'completed') {
                console.log('\n🎉 Payment completed!');
                console.log('  M-Pesa Receipt:', data.data.mpesa_receipt);
                return;
            } else if (data.data?.status === 'failed') {
                console.log('\n❌ Payment failed:', data.data.result_description);
                return;
            }
        } catch (error) {
            console.error('  Error polling status:', error);
        }
    }

    console.log('\n⚠️  Polling timeout. Check the Supabase dashboard for transaction status.');
}

// Run the test
testSTKPush();
