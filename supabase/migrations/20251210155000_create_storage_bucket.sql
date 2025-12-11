-- Create storage bucket for WhatsApp media if it doesn't exist
insert into storage.buckets (id, name, public)
values ('whatsapp-media', 'whatsapp-media', true)
on conflict (id) do nothing;

-- Drop existing policies if they exist
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Authenticated Upload" on storage.objects;

-- Policy for public read access (anyone can read uploaded files)
create policy "Public read access for whatsapp-media"
  on storage.objects for select
  using ( bucket_id = 'whatsapp-media' );

-- Policy for authenticated uploads (any authenticated user can upload)
create policy "Authenticated users can upload to whatsapp-media"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'whatsapp-media' );

-- Policy for authenticated updates (users can update their own files)
create policy "Authenticated users can update whatsapp-media"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'whatsapp-media' );

-- Policy for authenticated deletes
create policy "Authenticated users can delete from whatsapp-media"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'whatsapp-media' );
