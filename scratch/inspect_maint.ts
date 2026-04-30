async function inspectMaint() {
  const url = 'https://qualityconecta.vercel.app/api/bi-data?table=fat_manutencao_unificado&limit=1';
  try {
    const res = await fetch(url);
    const body = await res.json();
    const data = body.data || body;
    if (data.length > 0) {
      const keys = Object.keys(data[0]);
      console.log('Maint keys:', keys.filter(k => k.toLowerCase().includes('motivo') || k.toLowerCase().includes('justificativa') || k.toLowerCase().includes('cancel')));
      console.log('Example row subset:', {
        Motivo: data[0].Motivo,
        MotivoOcorrencia: data[0].MotivoOcorrencia,
        Justificativa: data[0].Justificativa,
        MotivoCancelamento: data[0].MotivoCancelamento
      });
    }
  } catch (err: any) {
    console.error('Error:', err.message || err);
  }
}
inspectMaint();
