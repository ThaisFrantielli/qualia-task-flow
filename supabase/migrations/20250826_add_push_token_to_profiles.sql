-- Adiciona campo push_token ao perfil do usuário para push notification
ALTER TABLE public.profiles ADD COLUMN push_token TEXT;
