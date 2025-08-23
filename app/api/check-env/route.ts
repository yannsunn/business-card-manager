import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  
  console.log('Environment check:');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('VERCEL_ENV:', process.env.VERCEL_ENV);
  console.log('GEMINI_API_KEY exists:', !!GEMINI_API_KEY);
  console.log('GEMINI_API_KEY length:', GEMINI_API_KEY?.length || 0);
  console.log('GEMINI_API_KEY starts with:', GEMINI_API_KEY?.substring(0, 10));
  
  // Test API call
  let apiTestResult = 'Not tested';
  if (GEMINI_API_KEY && GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE') {
    try {
      const testResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: 'Hello, this is a test. Reply with OK.'
              }]
            }]
          })
        }
      );
      
      if (testResponse.ok) {
        apiTestResult = 'API key is valid and working';
      } else {
        const errorText = await testResponse.text();
        apiTestResult = `API error: ${testResponse.status} - ${errorText.substring(0, 100)}`;
      }
    } catch (error: any) {
      apiTestResult = `Test failed: ${error.message}`;
    }
  }
  
  return NextResponse.json({
    environment: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    geminiApiKey: {
      exists: !!GEMINI_API_KEY,
      length: GEMINI_API_KEY?.length || 0,
      startsWidth: GEMINI_API_KEY?.substring(0, 10) || 'N/A',
      isDefault: GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE'
    },
    apiTest: apiTestResult,
    timestamp: new Date().toISOString()
  });
}