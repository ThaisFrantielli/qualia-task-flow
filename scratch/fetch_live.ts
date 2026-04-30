async function fetchLive() {
  const url = 'https://qualityconecta.vercel.app/api/bi-data?table=dim_regras_contrato&limit=50';
  console.log('Fetching', url);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    const data = body.data || body;
    console.log('Columns:', Object.keys(data[0] || {}));
    
    const franquias = data.filter((r: any) => JSON.stringify(r).toLowerCase().includes('franquia'));
    console.log(`Found ${franquias.length} franquias`);
    if (franquias.length > 0) {
      console.log(franquias.slice(0, 3));
    }
  } catch (err: any) {
    console.error('Error:', err.message || err);
  }
}

fetchLive();
