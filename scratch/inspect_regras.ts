import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://apqrjkobktjcyrxhqwtm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcXJqa29ia3RqY3lyeGhxd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTI4NzUsImV4cCI6MjA2Njk2ODg3NX0.99HhMrWfMStRH1p607RjOt6ChklI0iBjg8AGk_QUSbw'
);

async function main() {
  const { data, error } = await supabase
    .from('dim_regras_contrato')
    .select('*')
    .limit(10);
    
  if (error) {
    console.error('Error fetching data:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('Columns:');
    console.log(Object.keys(data[0]));
    
    console.log('\nData sample:');
    const franquiaRows = data.filter(r => JSON.stringify(r).toLowerCase().includes('franquia'));
    if (franquiaRows.length > 0) {
      console.log(franquiaRows.slice(0, 5));
    } else {
      console.log('No "franquia" rows found in first 10, let\'s search for it specifically...');
      const { data: searchData } = await supabase
        .from('dim_regras_contrato')
        .select('*');
        
      if (searchData) {
        const found = searchData.filter(r => JSON.stringify(r).toLowerCase().includes('franquia'));
        console.log(`Found ${found.length} rows with "franquia". Sample:`);
        console.log(found.slice(0, 5));
      }
    }
  } else {
    console.log('No data found.');
  }
}

main().catch(console.error);
