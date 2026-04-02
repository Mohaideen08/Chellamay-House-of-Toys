import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext(null);

// Map branch emails to their default branch name (must match branch name in DB)
const EMAIL_BRANCH_MAP = {
  'tenkasi@gmail.com':   'Tenkasi',
  'alangulam@gmail.com': 'Alangulam',
};

const getRoleFromEmail = (email) => {
  const e = email?.toLowerCase().trim();
  if (EMAIL_BRANCH_MAP[e]) return 'branch';
  return 'staff';
};

const buildProfile = (user) => ({
  id: user.id,
  username: user.email.split('@')[0],
  email: user.email,
  role: getRoleFromEmail(user.email),
  branchName: EMAIL_BRANCH_MAP[user.email?.toLowerCase().trim()] ?? null,
});

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
