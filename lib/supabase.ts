import { createClient } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences';

// مفتاح anon عام بطبيعة التصميم في Supabase ومحمي عبر سياسات RLS - مفتاح service_role محظور تماماً من كود الواجهة الأمامية
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
const supabaseKey = getValidSupabaseKey();

if (!import.meta.env.VITE_SUPABASE_URL) {
  console.warn("⚠️ VITE_SUPABASE_URL is not set in environment variables; using configured default.");
}

if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn("⚠️ VITE_SUPABASE_ANON_KEY is not set in environment variables; using configured default.");
}

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

export const supabase = createClient(supabaseUrl.trim(), supabaseKey.trim(), {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        storage: capacitorStorageAdapter,
    },
});
