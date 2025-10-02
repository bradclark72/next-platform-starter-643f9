
'use client';

import { useState, useTransition, useEffect } from 'react';
import {
  Loader2,
  UtensilsCrossed,
  MapPin,
  Star,
  MessageSquareText,
  PartyPopper,
  Zap,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getRestaurantDetails } from '@/app/actions';
import type { RestaurantDetailsLookupOutput } from '@/ai/flows/restaurant-details-lookup';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';
import { findNearbyRestaurants } from '@/app/actions';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { GoPremium } from './go-premium';
import type { Restaurant } from '@/ai/schemas';
import { useAuth } from '@/lib/firebase/auth';

const cuisines = [
  'Anything',
  'American',
  'European',
  'Italian',
  'Asian',
  'Indian',
  'Seafood',
  'Mexican',
];

export function DinnerPicker() {
  const { user, isPremium, spinCount } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(
    null
  );
  const [details, setDetails] = useState<RestaurantDetailsLookupOutput | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isFinding, startFinding] = useTransition();
  const { toast } = useToast();

  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [cuisine, setCuisine] = useState('Anything');
  const [mileage, setMileage] = useState([5]);

  const handlePickRestaurant = () => {
    if (!user) {
       toast({
        title: 'Not Logged In',
        description: 'You need to be logged in to pick a restaurant.',
        variant: 'destructive'
      });
      return;
    }
    if (!location) {
      toast({
        title: 'Location needed',
        description: 'Please enable location services and refresh.',
        variant: 'destructive'
      });
      return;
    }
  
    startFinding(async () => {
      setIsLoading(true);
      setDetails(null);
      setSelectedRestaurant(null);
  
      // Check spins with server BEFORE finding restaurants
      if (!isPremium) {
        const spinCheckRes = await fetch('/api/spins/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: user.uid })
        });
        
        const spinData = await spinCheckRes.json();
        
        if (!spinData.canSpin) {
          toast({
            title: 'Free Spins Used',
            description: 'You have used all your free spins. Please upgrade to premium for unlimited picks.',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }
      }
  
      const findResult = await findNearbyRestaurants({
        latitude: location.latitude,
        longitude: location.longitude,
        cuisine: cuisine === 'Anything' ? undefined : cuisine,
        radius: mileage[0],
      });
  
      if (findResult.error || !findResult.data || findResult.data.restaurants.length === 0) {
        let description = findResult.error || 'Try expanding your search radius or changing the cuisine.';
        if (findResult.error?.includes('Google Places API')) {
          description = "The Google Places API call failed. Please check your Google Cloud project settings.";
        }
        
        toast({
          title: 'No Restaurants Found',
          description: description,
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }
      
      // Use a spin on the server AFTER successful restaurant find
      if (!isPremium) {
        const useSpinRes = await fetch('/api/spins/use', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: user.uid })
        });
        
        const useSpinData = await useSpinRes.json();
        
        if (!useSpinData.success) {
          toast({
            title: 'Error',
            description: useSpinData.error,
            variant: 'destructive',
          });
        }
      }
  
      const restaurants = findResult.data.restaurants;
      const finalChoice = restaurants[Math.floor(Math.random() * restaurants.length)];
      setSelectedRestaurant(finalChoice);
      setIsLoading(false);
    });
  };
  
  const handleGetDetails = async () => {
    if (!selectedRestaurant) return;

    setIsLoading(true);
    const detailsResult = await getRestaurantDetails(selectedRestaurant.name);
    if (detailsResult.error) {
        toast({
            title: 'Error',
            description: detailsResult.error,
            variant: 'destructive',
        });
        setDetails(null);
    } else {
        setDetails(detailsResult.data);
    }
    setIsLoading(false);
  };
  
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => {
          toast({
            title: 'Location Error',
            description: 'Could not get your location. Please enable location services.',
            variant: 'destructive',
          });
        }
      );
    }
  }, [toast]);

  const findButtonDisabled = isLoading || isFinding || !location;

  return (
    <Card className="w-full max-w-2xl shadow-2xl bg-card/80 backdrop-blur-sm">
      <CardHeader className="text-center items-center">
        <div className="flex w-full justify-between items-center">
          <div></div>
          <div className="flex flex-col items-center">
            <div className="bg-primary/20 p-3 rounded-full mb-4 border-2 border-primary/30">
              <UtensilsCrossed className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="font-headline text-4xl">Dinner Picker</CardTitle>
          </div>
          <div></div>
        </div>

        <CardDescription className="pt-2">
          Can't decide where to eat? Let fate decide!
        </CardDescription>
        
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Cuisine</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 justify-items-center gap-2 pt-2">
                {cuisines.map((c) => {
                    return (
                        <Button 
                            key={c}
                            variant={cuisine === c ? "default" : "outline"}
                            onClick={() => setCuisine(c)}
                            className="flex flex-col h-24 gap-2 w-32"
                        >
                            <span className="text-lg">{c}</span>
                        </Button>
                    );
                })}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mileage-slider">Distance (miles)</Label>
            <div className="flex items-center gap-4">
              <Slider
                id="mileage-slider"
                min={1}
                max={15}
                step={1}
                value={mileage}
                onValueChange={setMileage}
              />
              <div className="font-bold text-primary w-8 text-center">{mileage[0]}</div>
            </div>
          </div>
        </div>
        <Separator />
        
        <div className="flex items-center justify-center">
          <Button
            size="lg"
            className="text-lg font-bold h-14 transition-all duration-300 transform active:scale-95"
            onClick={handlePickRestaurant}
            disabled={findButtonDisabled}
          >
            {isLoading || isFinding ? (
              <Loader2 className="animate-spin" />
            ) : !location ? (
              'Waiting for location...'
            ) : (
              <>
                Find a Restaurant
              </>
            )}
          </Button>
          {!isPremium && user && <span className="text-sm ml-2">({spinCount > 0 ? spinCount : 0} free spins left)</span>}
        </div>
      </CardContent>

      {(selectedRestaurant || isFinding) && (
        <>
          <Separator className="my-0" />
          <CardFooter className="flex flex-col gap-4 pt-6 text-center">
            {selectedRestaurant && !isLoading && (
                <div className="w-full">
                  <h3 className="text-sm text-muted-foreground font-medium">
                    {cuisine === 'Anything' ? 'And the winner is...' : `And the ${cuisine} winner is...`}
                  </h3>
                  <div
                    key={selectedRestaurant.name}
                    className="animate-in fade-in-50 slide-in-from-bottom-5 duration-500 text-3xl font-bold font-headline text-accent flex items-center justify-center gap-2 mt-2"
                  >
                    <PartyPopper className="h-8 w-8 text-primary" />
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedRestaurant.name)}&query_place_id=${selectedRestaurant.place_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {selectedRestaurant.name}
                    </a>
                  </div>
                  {selectedRestaurant.rating && (
                    <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mt-1">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span>{selectedRestaurant.rating}</span>
                      {selectedRestaurant.user_ratings_total && (
                        <span>({selectedRestaurant.user_ratings_total})</span>
                      )}
                    </div>
                  )}
                </div>
            )}
            
            {(isLoading || isFinding) && !selectedRestaurant && (
                 <div className="w-full flex justify-center items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Finding your dinner spot...</span>
                </div>
            )}

            {details && !isLoading && !isFinding && (
              <div key="details" className="w-full text-left p-4 bg-background rounded-lg border animate-in fade-in duration-500 mt-4 space-y-3">
                  <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                      <div>
                          <h4 className="font-semibold">Address</h4>
                          <p className="text-muted-foreground">{details.address}</p>
                      </div>
                  </div>
                  <div className="flex items-start gap-3">
                      <UtensilsCrossed className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                      <div>
                          <h4 className="font-semibold">Cuisine</h4>
                          <p className="text-muted-foreground">{details.cuisineType}</p>
                      </div>
                  </div>
                  <div className="flex items-start gap-3">
                      <Star className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                      <div>
                          <h4 className="font-semibold">Rating</h4>
                          <p className="text-muted-foreground">{details.customerRating}</p>
                      </div>
                  </div>
                  <div className="flex items-start gap-3">
                      <MessageSquareText className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                      <div>
                          <h4 className="font-semibold">Recent Review</h4>
                          <p className="text-muted-foreground italic">"{details.recentReview}"</p>
                      </div>
                  </div>
              </div>
            )}
            
            {(isLoading || isFinding) && selectedRestaurant && (
                 <div className="w-full flex justify-center items-center gap-2 text-muted-foreground mt-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Digging up the details...</span>
                </div>
            )}

            {(!isLoading && !isFinding) && selectedRestaurant && (
              <div className="flex w-full gap-4 mt-4">
                <Button size="lg" className="w-full" onClick={handleGetDetails}>
                    <Zap />
                    Get Details
                </Button>
              </div>
            )}
          </CardFooter>
        </>
      )}
    </Card>
  );
}

    