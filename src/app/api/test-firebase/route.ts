import { NextResponse } from 'next/server';

export async function GET() {
  console.log('🧪 Testing Firebase connection...');
  
  try {
    // Test 1: Can we import the module?
    console.log('Step 1: Importing firebase-admin module...');
    const { adminDb } = await import('@/lib/firebase-admin');
    console.log('✅ Import successful');
    
    // Test 2: Can we access Firestore?
    console.log('Step 2: Accessing Firestore...');
    const testRef = adminDb.collection('_test').doc('connection-test');
    console.log('✅ Firestore reference created');
    
    // Test 3: Can we write?
    console.log('Step 3: Writing test document...');
    await testRef.set({ 
      timestamp: new Date().toISOString(),
      test: 'connection successful' 
    });
    console.log('✅ Write successful');
    
    // Test 4: Can we read?
    console.log('Step 4: Reading test document...');
    const doc = await testRef.get();
    console.log('✅ Read successful');
    
    return NextResponse.json({ 
      success: true,
      message: 'Firebase is working!',
      data: doc.data()
    });
    
  } catch (error: any) {
    console.error('❌ Firebase test failed:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return NextResponse.json({ 
      success: false,
      error: error.message,
      name: error.name,
      stack: error.stack
    }, { status: 500 });
  }
}
