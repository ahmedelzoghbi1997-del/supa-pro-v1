import { createClient } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences';

const defaultUrl = 'https://ibudczfescwpmldarfbi.supabase.co';
const defaultAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlidWRjemZlc2N3cG1sZGFyZmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMzczOTksImV4cCI6MjA3NjcxMzM5OX0.nleKjCMgO2cOhMFR8psjXPqHnUK8PoAvv5kcp22KDKw';

const getValidSupabaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  if (typeof envUrl === 'string' && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))) {
    return envUrl.trim();
  }
  return defaultUrl;
};

const getValidSupabaseKey = (): string => {
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (typeof envKey === 'string' && envKey.trim().length > 20) {
    return envKey.trim();
  }
  return defaultAnonKey;
};

const supabaseUrl = getValidSupabaseUrl();
// WARNING: NEVER use the Service Role Key in the frontend. ONLY use the Anon Public Key here.
const supabaseKey = getValidSupabaseKey();

const capacitorStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const { value } = await Preferences.get({ key });
    return value;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await Preferences.set({ key, value });
  },
  removeItem: async (key: string): Promise<void> => {
    await Preferences.remove({ key });
  },
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        storage: capacitorStorageAdapter,
    },
});
