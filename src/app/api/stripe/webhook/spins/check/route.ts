import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;
    
    console.log('🔍 Checking spins for userId:', userId);
    
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    console.log('📊 Current user data:', userData);
    
    if (!userDoc.exists) {
      await adminDb.collection('users').doc(userId).set({
        spinsRemaining: 3,
        createdAt: new Date().toISOString(),
      });
      
      return NextResponse.json({ 
        canSpin: true,
        spinsRemaining: 3 
      });
    }
    
    const spinsRemaining = userData?.spinsRemaining || 0;
    
    return NextResponse.json({ 
      canSpin: spinsRemaining > 0,
      spinsRemaining 
    });
    
  } catch (error: any) {
    console.error('❌ ERROR in /api/spins/check:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}