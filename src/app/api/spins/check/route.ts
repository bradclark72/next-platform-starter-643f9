import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    const userDoc = await adminDb.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      // If user doc doesn't exist, create it with 3 free spins
      await adminDb.collection('users').doc(userId).set({
        spinsRemaining: 3,
        createdAt: new Date().toISOString(),
      });
      return NextResponse.json({ 
        canSpin: true,
        spinsRemaining: 3 
      });
    }
    
    const userData = userDoc.data();
    const spinsRemaining = userData?.spinsRemaining ?? 0;
    
    return NextResponse.json({ 
      canSpin: spinsRemaining > 0,
      spinsRemaining 
    });
    
  } catch (error: any) {
    console.error('❌ ERROR in /api/spins/check:', error.message);
    return NextResponse.json({ 
      error: 'Failed to check spins: ' + error.message 
    }, { status: 500 });
  }
}
