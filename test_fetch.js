fetch('https://ibudczfescwpmldarfbi.supabase.co/rest/v1/', { headers: { 'apikey': 'foo' }})
  .then(res => console.log('Fetch ok:', res.status))
  .catch(err => console.error('Fetch err:', err));
