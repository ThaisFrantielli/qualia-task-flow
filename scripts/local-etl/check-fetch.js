(async () => {
  // Check access to agg_rentabilidade_contratos_mensal.json
  const PROJECT_REF = 'apqrjkobktjcyrxhqwtm';
  const url = `https://${PROJECT_REF}.supabase.co/storage/v1/object/public/bi-reports/agg_rentabilidade_contratos_mensal.json?t=${Date.now()}`;

  // polyfill fetch for older Node versions
  let fetchFn = global.fetch;
  if (!fetchFn) {
    try { fetchFn = require('node-fetch'); } catch (e) { console.error('Instale node-fetch (npm i node-fetch) ou rode com Node >=18'); process.exit(2); }
  }

  console.log('URL:', url);
  try {
    const head = await fetchFn(url, { method: 'HEAD' });
    console.log('HEAD status:', head.status);
  } catch (err) {
    console.error('HEAD erro:', err.message);
  }

  try {
    const res = await fetchFn(url, { method: 'GET' });
    console.log('GET status:', res.status);
    const txt = await res.text();
    console.log('Tamanho (chars):', txt.length);
    console.log('Primeiros 600 chars:\n', txt.slice(0, 600));

    try {
      const parsed = JSON.parse(txt);
      if (Array.isArray(parsed)) {
        console.log('Formato: array no root (OK) — items:', parsed.length);
      } else if (parsed && Array.isArray(parsed.data)) {
        console.log('Formato: objeto com `data` array (OK) — data.length =', parsed.data.length);
      } else {
        console.warn('Formato inesperado: nem array nem { data: [] }');
      }
    } catch (err) {
      console.error('JSON inválido:', err.message);
    }
  } catch (err) {
    console.error('GET erro:', err.message);
  }
})();
