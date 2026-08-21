import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ibudczfescwpmldarfbi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlidWRjemZlc2N3cG1sZGFyZmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMzczOTksImV4cCI6MjA3NjcxMzM5OX0.nleKjCMgO2cOhMFR8psjXPqHnUK8PoAvv5kcp22KDKw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  // Let's query information_schema if possible, or try a dummy insert with null cycle_id
  const { data, error } = await supabase.from('advances').insert([
    {
      person_id: '11111111-1111-1111-1111-111111111111', // Dummy uuid if exists or not
      amount: -100,
      date: '2026-06-13',
      cycle_id: null,
      reason: 'test nullable cycle_id'
    }
  ]).select();

  console.log("Insert result:", { data, error });
}

test();
