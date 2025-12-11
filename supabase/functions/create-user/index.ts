import { serve } from 'std/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

serve(async (req) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    if (!token) return new Response(JSON.stringify({ success: false, error: 'Missing authorization token' }), { status: 401 })

    // verify caller user and ensure they are admin
    const caller = await admin.auth.getUser(token)
    if (caller.error || !caller.data?.user) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid token' }), { status: 401 })
    }

    const callerId = caller.data.user.id
    const { data: callerProfile } = await admin.from('profiles').select('nivelAcesso').eq('id', callerId).maybeSingle()
    if (!callerProfile || callerProfile.nivelAcesso !== 'Admin') {
      return new Response(JSON.stringify({ success: false, error: 'Not authorized' }), { status: 403 })
    }

    const body = await req.json()
    const { email, password, full_name, funcao, nivelAcesso } = body
    if (!email || !password || !full_name) {
      return new Response(JSON.stringify({ success: false, error: 'Missing fields' }), { status: 400 })
    }

    // Create auth user via Admin API
    const { data: createData, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    })

    if (createError) {
      return new Response(JSON.stringify({ success: false, error: createError.message || createError }), { status: 400 })
    }

    const newUserId = createData.user?.id
    if (!newUserId) {
      return new Response(JSON.stringify({ success: false, error: 'No user id returned' }), { status: 500 })
    }

    // Prepare profile via RPC
    const { data: rpcData, error: rpcError } = await admin.rpc('prepare_user_profile', {
      user_id: newUserId,
      user_full_name: full_name,
      user_funcao: funcao ?? null,
      user_nivel_acesso: nivelAcesso ?? 'Usuário'
    })

    if (rpcError) {
      // optionally delete created user to rollback
      await admin.auth.admin.deleteUser(newUserId).catch(() => {})
      return new Response(JSON.stringify({ success: false, error: rpcError.message || rpcError }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true, user_id: newUserId }), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ success: false, error: String(err) }), { status: 500 })
  }
})
