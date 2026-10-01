import React, {
  createContext, useContext, useEffect, useState, useCallback, useRef,
} from 'react';
import { isSupabaseConfigured, supabase } from './supabase';
import type { Profile, UserRole } from './types';

type AuthStatus = 'loading' | 'unauthenticated' | 'needs_cgu' | 'authenticated';

interface AuthContextValue {
  status: AuthStatus;
  session: import('@supabase/supabase-js').Session | null;
  profile: Profile | null;
  needsProfileCompletion: boolean;
  refreshProfile: () => Promise<void>;
  acceptCgu: () => Promise<string | null>;
  updateProfile: (patch: Partial<Profile>) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<AuthContextValue['session']>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);
  const mountedRef = useRef(true);

  const fetchProfileWithRetry = useCallback(async (userId: string): Promise<Profile | null> => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await supabase
        .from('profiles').select('*').eq('id', userId).maybeSingle();
      if (error) { await wait(500); continue; }
      if (data) return data as Profile;
      await wait(500);
    }
    return null;
  }, []);

  const computeStatus = useCallback(async (sess: AuthContextValue['session']) => {
    if (!sess?.user) {
      if (mountedRef.current) {
        setSession(null); setProfile(null); setStatus('unauthenticated');
      }
      return;
    }
    const prof = await fetchProfileWithRetry(sess.user.id);
    if (!mountedRef.current) return;
    if (!prof) {
      setNeedsProfileCompletion(true); setStatus('needs_cgu'); return;
    }
    setProfile(prof);
    const incomplete = !prof.nom || !prof.prenom || !prof.telephone;
    setNeedsProfileCompletion(incomplete);
    if (!prof.cgu_accepted) setStatus('needs_cgu');
    else setStatus('authenticated');
  }, [fetchProfileWithRetry]);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return;
    const prof = await fetchProfileWithRetry(session.user.id);
    if (!mountedRef.current || !prof) return;
    setProfile(prof);
    const incomplete = !prof.nom || !prof.prenom || !prof.telephone;
    setNeedsProfileCompletion(incomplete);
    if (!prof.cgu_accepted) setStatus('needs_cgu');
    else setStatus('authenticated');
  }, [session, fetchProfileWithRetry]);

  useEffect(() => {
    mountedRef.current = true;

    if (!isSupabaseConfigured) {
      setStatus('unauthenticated');
      return () => {
        mountedRef.current = false;
      };
    }

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mountedRef.current) return;
      setSession(data.session);
      await computeStatus(data.session);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      (async () => {
        if (!mountedRef.current) return;
        setSession(sess);
        await computeStatus(sess);
      })();
    });
    return () => {
      mountedRef.current = false;
      sub.subscription.unsubscribe();
    };
  }, [computeStatus]);

  const acceptCgu = useCallback(async (): Promise<string | null> => {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user ?? session?.user;
    if (!user) {
      console.error('CGU acceptance failed: no authenticated user session.');
      return 'Session utilisateur absente. Reconnectez-vous puis réessayez.';
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert(
        { id: user.id, cgu_accepted: true },
        { onConflict: 'id' },
      )
      .select()
      .single();
    if (error || !data) {
      console.error('CGU acceptance failed:', error ?? 'No profile returned.');
      return error?.message ?? 'Aucun profil utilisateur n’a été retourné.';
    }
    setProfile(data as Profile);
    setStatus('authenticated');
    return null;
  }, [session]);

  const updateProfile = useCallback(async (patch: Partial<Profile>): Promise<boolean> => {
    if (!session?.user) return false;
    const { data, error } = await supabase
      .from('profiles').update(patch)
      .eq('id', session.user.id).select().maybeSingle();
    if (error || !data) return false;
    setProfile(data as Profile);
    return true;
  }, [session]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null); setSession(null); setStatus('unauthenticated');
  }, []);

  return (
    <AuthContext.Provider value={{
      status, session, profile, needsProfileCompletion,
      refreshProfile, acceptCgu, updateProfile, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
