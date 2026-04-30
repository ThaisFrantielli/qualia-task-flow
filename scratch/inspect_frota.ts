async function inspectFrota() {
  const url = 'https://qualityconecta.vercel.app/api/bi-data?table=dim_frota&limit=1';
  try {
    const res = await fetch(url);
    const body = await res.json();
    const data = body.data || body;
    if (data.length > 0) {
      const keys = Object.keys(data[0]);
      console.log('Fipe related keys:', keys.filter(k => k.toLowerCase().includes('fipe')));
      console.log('Compra related keys:', keys.filter(k => k.toLowerCase().includes('compra')));
      console.log('Age related keys:', keys.filter(k => k.toLowerCase().includes('idade') || k.toLowerCase().includes('ano')));
    }
  } catch (err: any) {
    console.error('Error:', err.message || err);
  }
}
inspectFrota();
