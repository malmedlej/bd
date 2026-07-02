import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

const SESSION_KEY = 'bd_pulse_session';

interface AuthContextValue {
  profile: Profile | null;
  loading: boolean;
  signIn: (username: string, pin: string) => Promise<{ error: string | null }>;
  signOut: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadStoredUserId(): string | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: string };
    return parsed?.id ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      return null;
    }
    return data as Profile;
  }, []);

  useEffect(() => {
    const storedId = loadStoredUserId();
    if (!storedId) {
      setLoading(false);
      return;
    }
    fetchProfile(storedId).then((restored) => {
      if (restored) {
        setProfile(restored);
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
      setLoading(false);
    });
  }, [fetchProfile]);

  const signIn = async (username: string, pin: string): Promise<{ error: string | null }> => {
    const trimmedUsername = username.trim();
    if (!trimmedUsername || !pin) {
      return { error: 'Please enter your username and PIN.' };
    }

    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('username', trimmedUsername)
      .eq('pin', pin)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Unable to sign in', error);
      return { error: 'Unable to sign in. Please try again.' };
    }
    if (!data) {
      return { error: 'Invalid username or PIN.' };
    }

    const nextProfile = data as Profile;
    setProfile(nextProfile);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id: nextProfile.id }));
    return { error: null };
  };

  const signOut = () => {
    setProfile(null);
    localStorage.removeItem(SESSION_KEY);
  };

  const refreshProfile = useCallback(async () => {
    if (!profile) return;
    const refreshed = await fetchProfile(profile.id);
    if (refreshed) {
      setProfile(refreshed);
    } else {
      // Account was deactivated or removed — end the session.
      setProfile(null);
      localStorage.removeItem(SESSION_KEY);
    }
  }, [profile, fetchProfile]);

  return (
    <AuthContext.Provider value={{ profile, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
