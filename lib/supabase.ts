import { createClient } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences';

export const isSupabaseConfigured = Boolean(
  typeof import.meta.env.VITE_SUPABASE_URL === 'string' &&
  (import.meta.env.VITE_SUPABASE_URL.startsWith('http://') || import.meta.env.VITE_SUPABASE_URL.startsWith('https://')) &&
  !import.meta.env.VITE_SUPABASE_URL.includes('your-project-id') &&
  !import.meta.env.VITE_SUPABASE_URL.includes('placeholder.supabase.co') &&
  typeof import.meta.env.VITE_SUPABASE_ANON_KEY === 'string' &&
  import.meta.env.VITE_SUPABASE_ANON_KEY.trim().length > 20 &&
  !import.meta.env.VITE_SUPABASE_ANON_KEY.includes('your_supabase_anon')
);

const getValidSupabaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  if (typeof envUrl === 'string' && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))) {
    return envUrl.trim();
  }
  return 'https://placeholder.supabase.co';
};

const getValidSupabaseKey = (): string => {
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (typeof envKey === 'string' && envKey.trim().length > 20) {
    return envKey.trim();
  }
  return 'placeholder-anon-key-with-valid-length';
};

const supabaseUrl = getValidSupabaseUrl();
const supabaseKey = getValidSupabaseKey();

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
