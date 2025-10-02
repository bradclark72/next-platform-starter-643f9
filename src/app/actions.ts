
'use server';
import 'dotenv/config';

import { restaurantDetailsLookup } from '@/ai/flows/restaurant-details-lookup';
import type { RestaurantDetailsLookupOutput } from '@/ai/flows/restaurant-details-lookup';
import { findNearbyRestaurants as findNearbyRestaurantsFlow } from '@/ai/flows/find-nearby-restaurants';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';
import type { Restaurant } from '@/ai/schemas';

export async function getRestaurantDetails(restaurantName: string): Promise<{ data: RestaurantDetailsLookupOutput | null; error: string | null }> {
  if (!restaurantName) {
    return { data: null, error: 'Restaurant name is required.' };
  }
  try {
    const details = await restaurantDetailsLookup({ restaurantName });
    return { data: details, error: null };
  } catch (e: any) {
    console.error(e);
    return { data: null, error: 'Failed to get restaurant details.' };
  }
}

export async function findNearbyRestaurants(input: {latitude: number, longitude: number, cuisine?: string, radius: number}): Promise<{ data: { restaurants: Restaurant[] } | null; error: string | null }> {
    if (!process.env.GOOGLE_PLACES_API_KEY) {
      return { data: null, error: 'The Google Places API key is missing. Please add it to your environment variables.' };
    }
    try {
        const result = await findNearbyRestaurantsFlow(input);
        return { data: { restaurants: result.restaurants }, error: null };
    } catch(e: any) {
        console.error(e);
        return { data: null, error: 'Failed to find nearby restaurants. This may be due to an incorrect Google Places API key or configuration.' };
    }
}

export async function upgradeToPremium(userId: string): Promise<{ error: string | null }> {
  if (!userId) {
    return { error: 'User not found.' };
  }
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { isPremium: true });
    return { error: null };
  } catch (e: any) {
    console.error(e);
    return { error: 'Failed to upgrade to premium.' };
  }
}

export async function createCheckoutSession(
  uid: string
): Promise<{ sessionId: string } | { error: string }> {
  try {
    const host = headers().get('host');
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      throw new Error('STRIPE_PRICE_ID is not set.');
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${baseUrl}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/`,
      metadata: {
        uid: uid,
      },
    });

    if (!session.id) {
        throw new Error('Could not create checkout session');
    }

    return { sessionId: session.id };
  } catch (err: any) {
    console.error(err);
    return { error: 'Failed to create checkout session' };
  }
}

    