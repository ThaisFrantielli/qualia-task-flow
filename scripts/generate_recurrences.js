/*
  Script to be run daily (cron) to ensure N future occurrences exist for each recurring parent task.

  Usage:
    export SUPABASE_URL="..."
    export SUPABASE_SERVICE_ROLE_KEY="..."
    node scripts/generate_recurrences.js

  Note: Use the Supabase service role key for server-side operations.
*/

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

const { calculateNextDate, generateNextOccurrences } = require('../src/lib/recurrenceUtils');

async function ensureOccurrences(windowSize = 5) {
  // Fetch parent tasks that are marked as recurring
  const { data: parents, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('is_recurring', true)
    .is('parent_task_id', null);

  if (error) {
    console.error('Erro ao buscar tarefas recorrentes:', error);
    return;
  }

  for (const parent of parents || []) {
    try {
      // count how many future occurrences already exist
      const { data: existing, error: e2 } = await supabase
        .from('tasks')
        .select('id, due_date')
        .eq('parent_task_id', parent.id)
        .gte('due_date', new Date().toISOString().slice(0, 10));

      if (e2) {
        console.error('Erro ao buscar ocorrências existentes para', parent.id, e2);
        continue;
      }

      const countExisting = (existing || []).length;
      const toCreate = Math.max(0, windowSize - countExisting);
      if (toCreate <= 0) continue;

      // Use helper to generate next occurrences
      const occurrences = generateNextOccurrences(parent, toCreate);
      if (occurrences.length === 0) continue;

      const { error: insertErr } = await supabase.from('tasks').insert(occurrences);
      if (insertErr) console.error('Erro inserindo ocorrências para', parent.id, insertErr);
      else console.log(`Geradas ${occurrences.length} ocorrências para parent ${parent.id}`);
    } catch (err) {
      console.error('Erro gerando ocorrências para parent', parent.id, err);
    }
  }
}

ensureOccurrences().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
