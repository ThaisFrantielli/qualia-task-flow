Recurrence migration variants
=============================

This folder contains several SQL variants to add recurrence columns to the `tasks` table. Choose the variant that fits your environment and paste it into the Supabase SQL Editor (or run via your migration tool).

Files
- `20251113_add_recurrence_to_tasks_minimal.sql` — Minimal: only `ALTER TABLE` to add recurrence columns and indexes. Safe to paste into SQL Editor.
- `20251113_add_recurrence_with_pgcrypto.sql` — Adds same columns + creates `task_recurrence_history` and uses `gen_random_uuid()`; includes `CREATE EXTENSION IF NOT EXISTS pgcrypto;`. Use only if your DB allows creating extensions.
- `20251113_add_recurrence_with_uuid_ossp.sql` — Similar to pgcrypto variant but uses `uuid-ossp`'s `uuid_generate_v4()`; includes `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`.

Which to use
- If you only want schema columns: use the `minimal` file.
- If you want an audit/history table and your DB allows creating extensions: pick one of the extension variants. On Supabase, `pgcrypto` is usually available; if not, try `uuid-ossp`.

Applying via Supabase SQL Editor
1. Open your Supabase project → Database → SQL Editor.
2. Create a new query, paste the SQL from the chosen file and run it.
3. Confirm the columns appear in `public.tasks` (Database → Table Editor → tasks) and that indexes are created.

Notes and cautions
- Always backup your database or run this first in a staging environment.
- Creating extensions requires elevated privileges. If you don't have permission, use the `minimal` variant and skip the history table.
- The app code assumes these columns exist; deploy frontend/backend changes and migrations together when possible.
