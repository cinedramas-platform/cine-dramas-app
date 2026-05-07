import { createClient } from '@supabase/supabase-js';
import { handleCorsPreflightRequest } from '../_shared/cors.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';

Deno.serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  let body: { email?: unknown; password?: unknown; tenant_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body');
  }

  const { email, password, tenant_id } = body;
  if (typeof email !== 'string' || !email.includes('@')) {
    return errorResponse('Valid email is required');
  }
  if (typeof password !== 'string' || password.length < 6) {
    return errorResponse('Password must be at least 6 characters');
  }
  if (typeof tenant_id !== 'string' || tenant_id.length === 0) {
    return errorResponse('tenant_id is required');
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { tenant_id },
  });

  if (error) {
    if (error.message.includes('already been registered')) {
      return errorResponse('An account with this email already exists', 409);
    }
    return errorResponse(error.message, 500);
  }

  // The on_auth_user_created trigger may fire before app_metadata is set,
  // so ensure the public.users row exists.
  const { error: profileError } = await supabaseAdmin
    .from('users')
    .upsert(
      { auth_id: data.user.id, tenant_id, email },
      { onConflict: 'auth_id' },
    );

  if (profileError) {
    return errorResponse(profileError.message, 500);
  }

  return jsonResponse(
    { user: { id: data.user.id, email: data.user.email } },
    { status: 201 },
  );
});
