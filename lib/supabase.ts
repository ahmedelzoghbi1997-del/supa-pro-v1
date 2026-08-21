import { createClient } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences';

const supabaseUrl = 'https://ibudczfescwpmldarfbi.supabase.co';
// WARNING: NEVER use the Service Role Key in the frontend. ONLY use the Anon Public Key here.
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlidWRjemZlc2N3cG1sZGFyZmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMzczOTksImV4cCI6MjA3NjcxMzM5OX0.nleKjCMgO2cOhMFR8psjXPqHnUK8PoAvv5kcp22KDKw';

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
