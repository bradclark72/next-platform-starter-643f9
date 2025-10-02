'use client';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';

export function GoPremium() {
    const paymentLink = 'https://buy.stripe.com/8x26oGaay8GjbXpdBf8AE05';

    const handleUpgrade = () => {
        window.open(paymentLink, '_blank');
    }

    return (
        <Button 
            size="lg" 
            className="w-full h-14 text-lg font-bold" 
            onClick={handleUpgrade}
        >
            <Zap />
            Go Premium for Unlimited Spins
        </Button>
    );
}
