
'use server';

/**
 * @fileOverview This file defines a Genkit flow for finding nearby restaurants based on user's location, cuisine preference, and radius.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { FindNearbyRestaurantsInputSchema, FindNearbyRestaurantsOutputSchema } from '@/ai/schemas';

export type FindNearbyRestaurantsInput = z.infer<typeof FindNearbyRestaurantsInputSchema>;
export type FindNearbyRestaurantsOutput = z.infer<typeof FindNearbyRestaurantsOutputSchema>;

/**
 * A tool for searching for places, like restaurants.
 * In a real app, this would be implemented by calling a service like Google Places API.
 */
const placeSearch = ai.defineTool(
  {
    name: 'placeSearch',
    description: 'Find real-world places, like restaurants, that are near a location.',
    inputSchema: z.object({
      latitude: z.number().describe("The user's latitude."),
      longitude: z.number().describe("The user's longitude."),
      cuisine: z.string().optional().describe('The desired cuisine type keyword (e.g., "Italian", "Sushi").'),
      radius: z.number().describe('The search radius in miles.'),
    }),
    outputSchema: z.object({
      restaurants: z.array(z.object({
        name: z.string(),
        rating: z.number().optional(),
        user_ratings_total: z.number().optional(),
        place_id: z.string().optional(),
      })).describe('A list of restaurants found.'),
    }),
  },
  async (input) => {
    console.log(`Tool called with: ${JSON.stringify(input)}`);
    const fetch = (await import('node-fetch')).default;

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_PLACES_API_KEY is not set in the environment.');
    }
    
    // Convert radius from miles to meters
    const radiusInMeters = input.radius * 1609.34;
    
    const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    url.searchParams.append('location', `${input.latitude},${input.longitude}`);
    url.searchParams.append('radius', radiusInMeters.toString());
    url.searchParams.append('type', 'restaurant');
    if (input.cuisine && input.cuisine !== 'Anything') {
      url.searchParams.append('keyword', input.cuisine);
    }
    url.searchParams.append('key', apiKey);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Google Places API request failed with status ${response.status}: ${errorBody}`);
        throw new Error(`Google Places API request failed with status ${response.status}`);
      }
      const data = await response.json() as { results: { name: string, rating?: number, user_ratings_total?: number, place_id?: string }[], status: string, error_message?: string };

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.error('Google Places API Error:', data.error_message || data.status);
        // Return empty array on API error to not crash the app
        return { restaurants: [] };
      }

      const restaurants = data.results?.map(place => ({ 
        name: place.name,
        rating: place.rating,
        user_ratings_total: place.user_ratings_total,
        place_id: place.place_id
      })) || [];
      return { restaurants };
    } catch (error) {
      console.error("Failed to fetch from Google Places API:", error);
      // Return an empty array in case of a network error or other exception
      return { restaurants: [] };
    }
  }
);

export async function findNearbyRestaurants(
  input: FindNearbyRestaurantsInput
): Promise<FindNearbyRestaurantsOutput> {
  return findNearbyRestaurantsFlow(input);
}

const findNearbyRestaurantsFlow = ai.defineFlow(
  {
    name: 'findNearbyRestaurantsFlow',
    inputSchema: FindNearbyRestaurantsInputSchema,
    outputSchema: FindNearbyRestaurantsOutputSchema,
  },
  async (input) => {
    const searchResult = await placeSearch(input);
    
    if (searchResult?.restaurants) {
        return {
            restaurants: searchResult.restaurants
        }
    }
    
    return { restaurants: [] };
  }
);
