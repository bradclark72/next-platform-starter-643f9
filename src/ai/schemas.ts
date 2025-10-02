
import { z } from 'zod';

export const RestaurantSchema = z.object({
  name: z.string().describe('The name of the restaurant.'),
  rating: z.number().optional().describe('The star rating of the restaurant.'),
  user_ratings_total: z.number().optional().describe('The total number of ratings for the restaurant.'),
  place_id: z.string().optional().describe('The Google Places ID for the restaurant.'),
});
export type Restaurant = z.infer<typeof RestaurantSchema>;

export const FindNearbyRestaurantsInputSchema = z.object({
  latitude: z.number().describe("The user's latitude."),
  longitude: z.number().describe("The user's longitude."),
  cuisine: z.string().optional().describe('The desired cuisine type.'),
  radius: z.number().describe('The search radius in miles.'),
});

export const FindNearbyRestaurantsOutputSchema = z.object({
  restaurants: z.array(RestaurantSchema).describe('A list of restaurants.'),
});

export const RestaurantDetailsLookupInputSchema = z.object({
  restaurantName: z
    .string()
    .describe('The name of the restaurant to look up details for.'),
});

export const RestaurantDetailsLookupOutputSchema = z.object({
  address: z.string().describe('The address of the restaurant.'),
  cuisineType: z.string().describe('The cuisine type of the restaurant.'),
  customerRating: z.string().describe('The customer rating of the restaurant.'),
  recentReview: z.string().describe('A recent review of the restaurant.'),
});
