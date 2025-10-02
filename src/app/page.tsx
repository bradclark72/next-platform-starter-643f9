
import { DinnerPicker } from '@/components/dinner-picker';
import { AuthGate } from '@/lib/firebase/auth';

export default function Home() {
  return (
    <AuthGate>
      <main className="flex min-h-screen w-full flex-col items-center justify-center p-4 sm:p-6 md:p-8">
        <DinnerPicker />
      </main>
    </AuthGate>
  );
}
