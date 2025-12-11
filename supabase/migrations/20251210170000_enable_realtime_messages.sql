-- Enable Realtime for whatsapp_messages table
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;

-- Grant access to service role for Realtime
GRANT SELECT, INSERT, UPDATE ON whatsapp_messages TO service_role;
GRANT SELECT, INSERT, UPDATE ON whatsapp_messages TO anon;
GRANT SELECT, INSERT, UPDATE ON whatsapp_messages TO authenticated;
