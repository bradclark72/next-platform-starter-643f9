import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { firestore } from 'firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 });
    }
    
    const userData = userDoc.data();
    const spinsRemaining = userData?.spinsRemaining ?? 0;
    
    if (spinsRemaining <= 0) {
      return NextResponse.json({ 
        error: 'No spins remaining' 
      }, { status: 403 });
    }
    
    // Using a transaction to be safe, though FieldValue.increment is atomic
    await userRef.update({
      spinsRemaining: firestore.FieldValue.increment(-1),
      lastSpinAt: new Date().toISOString(),
    });
    
    return NextResponse.json({ 
      success: true,
      spinsRemaining: spinsRemaining - 1 
    });
    
  } catch (error: any) {
    console.error('❌ ERROR in /api/spins/use:', error);
    return NextResponse.json({ 
      error: 'Failed to use spin: ' + error.message 
    }, { status: 500 });
  }
}
