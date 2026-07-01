// Supabase Edge Function: admin-create-user
//
// Creates a real Supabase Auth user plus its matching public.profiles row.
// This MUST run server-side: it is the only place SUPABASE_SERVICE_ROLE_KEY
// is used. The service role key must never be shipped to the frontend and
// auth.admin.createUser must never be called from browser code.
//
// Only an authenticated caller whose public.profiles.role = 'owner' may
// invoke this successfully.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const ROLES = ['owner', 'manager', 'member'];

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY env vars');
    return jsonResponse({ error: 'server_misconfigured' }, 500);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'not_authenticated' }, 401);
  }

  // Client scoped to the caller's own JWT — used only to verify who is calling.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: callerData, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerData?.user) {
    return jsonResponse({ error: 'not_authenticated' }, 401);
  }

  // Service-role client — never exposed to the browser, used for privileged reads/writes only.
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: callerProfile, error: profileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', callerData.user.id)
    .maybeSingle();

  if (profileError || !callerProfile || callerProfile.role !== 'owner') {
    return jsonResponse({ error: 'not_owner' }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }

  const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const role = typeof body.role === 'string' ? body.role : '';
  const department = typeof body.department === 'string' && body.department.trim()
    ? body.department.trim()
    : 'Business Development';
  const isActive = body.is_active !== false;

  if (!fullName) return jsonResponse({ error: 'full_name_required' }, 400);
  if (!email) return jsonResponse({ error: 'email_required' }, 400);
  if (!password || password.length < 8) return jsonResponse({ error: 'password_invalid' }, 400);
  if (!ROLES.includes(role)) return jsonResponse({ error: 'role_invalid' }, 400);

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError || !created?.user) {
    const message = createError?.message ?? 'create_user_failed';
    const isDuplicate = /already.*registered|already.*exists/i.test(message);
    return jsonResponse({ error: isDuplicate ? 'email_exists' : message }, 400);
  }

  const { error: upsertError } = await adminClient
    .from('profiles')
    .upsert({
      id: created.user.id,
      full_name: fullName,
      email,
      role,
      department,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (upsertError) {
    console.error('Auth user created but profile upsert failed', upsertError);
    return jsonResponse({ error: 'profile_upsert_failed' }, 500);
  }

  return jsonResponse({ success: true, user_id: created.user.id }, 200);
});
