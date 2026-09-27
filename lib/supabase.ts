import { createClient } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences';

const getValidSupabaseUrl = (): string => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
    return url.trim();
  }
  return 'https://ibudczfescwpmldarfbi.supabase.co';
};

const getValidSupabaseKey = (): string => {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (typeof key === 'string' && key.trim().length > 20) {
    return key.trim();
  }
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlidWRjemZlc2N3cG1sZGFyZmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMzczOTksImV4cCI6MjA3NjcxMzM5OX0.nleKjCMgO2cOhMFR8psjXPqHnUK8PoAvv5kcp22KDKw';
};

const supabaseUrl = getValidSupabaseUrl();
const supabaseKey = getValidSupabaseKey();

export const isSupabaseConfigured = Boolean(
  typeof supabaseUrl === 'string' &&
  (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://')) &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseUrl.includes('placeholder.supabase.co') &&
  typeof supabaseKey === 'string' &&
  supabaseKey.trim().length > 20 &&
  !supabaseKey.includes('your_supabase_anon')
);

const capacitorStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    try {
      const { value } = await Preferences.get({ key });
      return value;
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
      await Preferences.set({ key, value });
    } catch {}
  },
  removeItem: async (key: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
      await Preferences.remove({ key });
    } catch {}
  },
};

const safeCustomFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  if (!isSupabaseConfigured) {
    return new Response(JSON.stringify({ error: 'Supabase is not configured' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  try {
    return await fetch(input, init);
  } catch (err) {
    console.warn('Network request failed in Supabase client:', err);
    return new Response(JSON.stringify({ error: 'Network error' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: isSupabaseConfigured,
        persistSession: isSupabaseConfigured,
        detectSessionInUrl: false,
        storage: capacitorStorageAdapter,
    },
    global: {
        fetch: safeCustomFetch,
    },
});
