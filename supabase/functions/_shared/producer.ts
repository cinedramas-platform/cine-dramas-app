// Producer gate for portal edge functions (mux-direct-upload, catalog-admin,
// mux-analytics).
//
// Preferred source of truth: users.role ('producer' or 'admin'), added by
// migration 20260709150000_add_user_role. Until that migration is applied
// everywhere, the PORTAL_PRODUCER_EMAILS env allowlist keeps working as a
// fallback. With neither configured, access is denied — fail closed.

// deno-lint-ignore no-explicit-any
type ServiceClient = any;

export async function isProducer(
  user: { id: string; email?: string | null },
  service: ServiceClient,
): Promise<boolean> {
  const { data } = await service
    .from('users')
    .select('role')
    .eq('auth_id', user.id)
    .maybeSingle();
  // Errors (e.g. role column not migrated yet) leave data null → fallback.
  if (data?.role === 'producer' || data?.role === 'admin') {
    return true;
  }

  const allowlist = (Deno.env.get('PORTAL_PRODUCER_EMAILS') ?? '')
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);
  return !!user.email && allowlist.includes(user.email.toLowerCase());
}
