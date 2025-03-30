/**
 * Test script to check LiveKit token endpoint connectivity
 * 
 * Usage:
 * 1. Open browser console
 * 2. Run: import('./test-connection.js').then(m => m.default())
 * 3. Check console for results
 */

export default async function testLiveKitConnection() {
  console.log('Testing LiveKit token endpoint connection...');
  
  try {
    // Test relative URL (with proxy)
    console.log('Testing with relative URL:');
    const relativeResponse = await fetch('/api/livekit/token?user_id=test-user');
    
    if (relativeResponse.ok) {
      const data = await relativeResponse.json();
      console.log('✅ Success with relative URL!', data);
    } else {
      console.error('❌ Failed with relative URL:', relativeResponse.statusText);
      
      // Try with absolute URL as fallback
      console.log('Testing with absolute URL:');
      const absoluteResponse = await fetch('http://localhost:8000/api/livekit/token?user_id=test-user');
      
      if (absoluteResponse.ok) {
        const data = await absoluteResponse.json();
        console.log('✅ Success with absolute URL!', data);
      } else {
        console.error('❌ Failed with absolute URL:', absoluteResponse.statusText);
      }
    }
    
    // Test test endpoint
    console.log('Testing /api/test endpoint:');
    const testEndpointResponse = await fetch('/api/test');
    
    if (testEndpointResponse.ok) {
      const data = await testEndpointResponse.json();
      console.log('✅ Test endpoint success!', data);
    } else {
      console.error('❌ Test endpoint failed:', testEndpointResponse.statusText);
    }
    
  } catch (error) {
    console.error('❌ Connection test failed with error:', error);
  }
}

// You can uncomment this line to auto-run the test when this file is loaded
// testLiveKitConnection(); 