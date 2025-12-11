# create-user Edge Function

Brief notes and commands to serve and deploy the `create-user` Supabase Edge Function.

Prerequisites
- Install the Supabase CLI: `npm install -g supabase` or follow https://supabase.com/docs/guides/cli
- Be logged in with `supabase login` and have access to the target project.
- Ensure the function's required secrets are configured: `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL`.

Local serve (PowerShell)

1. Set required environment variables in PowerShell (temporary for the session):

```powershell
$env:SUPABASE_SERVICE_ROLE_KEY = "<your-service-role-key>"
$env:SUPABASE_URL = "https://<your-project>.supabase.co"
```

2. Serve functions locally from the repository root:

```powershell
# using the supabase CLI directly
supabase functions serve

# or via npm script
npm run supabase:functions:serve
```

Deploy the `create-user` function

1. (Optional) Ensure project ref is set or pass `--project-ref <ref>` to the command.

2. Deploy the function:

```powershell
# deploy only the create-user function
supabase functions deploy create-user
# or using the npm script
npm run supabase:functions:deploy:create-user
```

3. Set function secrets (on the project) so the function has the service role key and url available at runtime:

```powershell
# set secrets using the supabase CLI (once)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"
supabase secrets set SUPABASE_URL="https://<your-project>.supabase.co"
```

Notes
- Keep the service-role key secret and never expose it in client-side code.
- The function uses the Admin API to create auth users and then calls the `prepare_user_profile` RPC to set profile fields (including `force_password_change`).
- If you need to test integration from the frontend while serving functions locally, ensure the frontend calls the local functions endpoint (the CLI will log the local address).

If you want, I can also add a short helper script to set the secrets from a `.env` file — tell me how you'd like those secrets stored and I'll add it.
