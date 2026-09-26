import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      VITE_SUPABASE_URL: 'https://test-project.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key-with-length-greater-than-twenty-characters',
    },
  },
});
