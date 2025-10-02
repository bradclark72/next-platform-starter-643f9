
'use client';

import { 
  getAuth, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User
} from 'firebase/auth';
import { app, db } from './config';
import React, { useState, useEffect, useContext, createContext, Dispatch, SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import Loading from '@/app/loading';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';

const auth = getAuth(app);

export const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  isPremium: boolean;
  spinCount: number;
  signIn: (p: any) => Promise<any>;
  signUp: (p: any) => Promise<any>;
  signOut: () => Promise<any>;
}>({
    user: null,
    loading: true,
    isPremium: false,
    spinCount: 0,
    signIn: () => new Promise(r => r),
    signOut:() => new Promise(r => r),
    signUp: () => new Promise(r => r),
});

export const AuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [spinCount, setSpinCount] = useState(0);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setIsPremium(data.isPremium);
          setSpinCount(data.spinCount || 0);
        }
      });
      return () => unsubscribe();
    } else {
        // Reset state when user logs out
        setIsPremium(false);
        setSpinCount(0);
    }
  }, [user]);

  const signIn = (p: any) => signInWithEmailAndPassword(auth, p.email, p.password);
  
  const signUp = async (p: any) => {
    const userCredential = await createUserWithEmailAndPassword(auth, p.email, p.password);
    const user = userCredential.user;
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
      // Set initial values for a new user
      await setDoc(userDocRef, { 
        isPremium: false, 
        email: user.email,
        spinCount: 0 
      });
    }
    return userCredential;
  };

  const signOut = () => firebaseSignOut(auth);

  const value = {
    user,
    loading,
    isPremium,
    spinCount,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    return useContext(AuthContext);
}

export const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <Loading />;
  }

  return <>{children}</>;
};
