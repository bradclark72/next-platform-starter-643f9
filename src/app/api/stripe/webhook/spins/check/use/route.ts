import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;
    
    console.log('🎰 Using spin for userId:', userId);
    
    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 });
    }
    
    const userData = userDoc.data();
    const spinsRemaining = userData?.spinsRemaining || 0;
    
    console.log('📊 Spins before:', spinsRemaining);
    
    if (spinsRemaining <= 0) {
      return NextResponse.json({ 
        error: 'No spins remaining' 
      }, { status: 403 });
    }
    
    await userRef.update({
      spinsRemaining: spinsRemaining - 1,
      lastSpinAt: new Date().toISOString(),
    });
    
    console.log('✅ Spins after:', spinsRemaining - 1);
    
    return NextResponse.json({ 
      success: true,
      spinsRemaining: spinsRemaining - 1 
    });
    
  } catch (error: any) {
    console.error('❌ ERROR in /api/spins/use:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}