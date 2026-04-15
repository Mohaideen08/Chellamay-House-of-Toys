import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext(null);

// Map emails to { branchName, role }
// roles: 'admin' = full access, 'staff' = read-only + billing add/edit only
const EMAIL_CONFIG = {
  'tenkasi@gmail.com':      { branchName: 'Tenkasi',   role: 'admin' },
  'alangulam@gmail.com':    { branchName: 'Alangulam', role: 'admin' },
  'tenkasistaff@gmail.com': { branchName: 'Tenkasi',   role: 'staff' },
};


const buildProfile = (user) => {
  const e = user.email?.toLowerCase().trim();
  const cfg = EMAIL_CONFIG[e] ?? { branchName: null, role: 'staff' };
  return {
    id: user.id,
    username: user.email.split('@')[0],
    email: user.email,
    role: cfg.role,
    branchName: cfg.branchName,
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const safetyTimer = setTimeout(() => setLoading(false), 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      clearTimeout(safetyTimer);
      if (session?.user) {
        setUser(session.user);
        setProfile(buildProfile(session.user));
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data?.user) {
      setUser(data.user);
      setProfile(buildProfile(data.user));
    }
    return { data, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
