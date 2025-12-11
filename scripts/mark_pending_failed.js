(async () => {
  try {
    const path = require('path');
    const dotenv = require('dotenv');
    const { createClient } = require('@supabase/supabase-js');

    const envPath = path.join(__dirname, '..', 'whatsapp-service', '.env');
    dotenv.config({ path: envPath });

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in', envPath);
      process.exit(1);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    console.log('Marking pending messages as failed...');
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('status', 'pending');

    if (error) {
      console.error('Update error:', error);
      process.exit(1);
    }

    console.log('Updated rows:', Array.isArray(data) ? data.length : data);
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
})();
