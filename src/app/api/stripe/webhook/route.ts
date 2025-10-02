import { stripe } from '@/lib/stripe';
import { adminDb } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req: Request) {
  console.log('🔔 Webhook received');
  
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    console.error('❌ No signature in request');
    return new NextResponse('No signature', { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not set');
    return new NextResponse('Webhook secret not configured', { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log('✅ Webhook verified successfully');
  } catch (err) {
    const error = err as Error;
    console.error('❌ Webhook verification failed:', error.message);
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  console.log('📨 Event type:', event.type);

  try {
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;
        
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new NextResponse('Webhook processing failed', { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const uid = session.metadata?.uid;
  
  if (!uid) {
    console.error('❌ No uid in session metadata');
    return;
  }

  try {
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;
    
    await adminDb.collection('users').doc(uid).set({
      isPremium: true,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    
    console.log(`✅ User ${uid} upgraded to premium`);
  } catch (error) {
    console.error(`❌ Error upgrading user ${uid}:`, error);
    throw error;
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const uid = subscription.metadata?.uid;
  const customerId = subscription.customer as string;
  
  let userId = uid;
  
  if (!userId) {
    const userSnapshot = await adminDb
      .collection('users')
      .where('stripeCustomerId', '==', customerId)
      .limit(1)
      .get();
    
    if (userSnapshot.empty) {
      console.error('❌ No user found for subscription');
      return;
    }
    
    userId = userSnapshot.docs[0].id;
  }
  
  await adminDb.collection('users').doc(userId).set({
    isPremium: subscription.status === 'active',
    stripeSubscriptionId: subscription.id,
    stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    subscriptionStatus: subscription.status,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
  
  console.log(`✅ Subscription updated for user ${userId}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const uid = subscription.metadata?.uid;
  const customerId = subscription.customer as string;
  
  let userId = uid;
  
  if (!userId) {
    const userSnapshot = await adminDb
      .collection('users')
      .where('stripeCustomerId', '==', customerId)
      .limit(1)
      .get();
    
    if (userSnapshot.empty) {
      console.error('❌ No user found for subscription');
      return;
    }
    
    userId = userSnapshot.docs[0].id;
  }
  
  await adminDb.collection('users').doc(userId).set({
    isPremium: false,
    subscriptionStatus: 'cancelled',
    updatedAt: new Date().toISOString(),
  }, { merge: true });
  
  console.log(`✅ Subscription cancelled for user ${userId}`);
}
