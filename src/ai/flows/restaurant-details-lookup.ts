
'use server';

/**
 * @fileOverview This file defines a Genkit flow for looking up details about a restaurant using an LLM.
 *
 * The flow takes a restaurant name as input and returns details such as address, cuisine type, customer rating, and a recent review.
 *
 * @interface RestaurantDetailsLookupInput - Input interface for the restaurantDetailsLookup function.
 * @interface RestaurantDetailsLookupOutput - Output interface for the restaurantDetailsLookup function.
 * @function restaurantDetailsLookup - The main function that triggers the flow to fetch restaurant details.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { RestaurantDetailsLookupInputSchema, RestaurantDetailsLookupOutputSchema } from '@/ai/schemas';

export type RestaurantDetailsLookupInput = z.infer<
  typeof RestaurantDetailsLookupInputSchema
>;

export type RestaurantDetailsLookupOutput = z.infer<
  typeof RestaurantDetailsLookupOutputSchema
>;

export async function restaurantDetailsLookup(
  input: RestaurantDetailsLookupInput
): Promise<RestaurantDetailsLookupOutput> {
  return restaurantDetailsLookupFlow(input);
}

const restaurantDetailsLookupPrompt = ai.definePrompt({
  name: 'restaurantDetailsLookupPrompt',
  input: {schema: RestaurantDetailsLookupInputSchema},
  output: {schema: RestaurantDetailsLookupOutputSchema},
  prompt: `You are a restaurant expert providing details about restaurants.
  Provide the address, cuisine type, customer rating, and a recent review for the following restaurant:
  Restaurant Name: {{{restaurantName}}}
  \n
  Make your best judgement as to whether the displayed info matches the restaurant the user originally had in mind.
  Format the output in a structured way so that each field corresponds to its description in the schema.`,
});

const restaurantDetailsLookupFlow = ai.defineFlow(
  {
    name: 'restaurantDetailsLookupFlow',
    inputSchema: RestaurantDetailsLookupInputSchema,
    outputSchema: RestaurantDetailsLookupOutputSchema,
  },
  async input => {
    const {output} = await restaurantDetailsLookupPrompt(input);
    return output!;
  }
);
