import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, SUPABASE_URL } from './lib/supabase';
import type { TenantConfig } from './lib/types';
import Login from './pages/Login';
import Catalog from './pages/Catalog';
import Upload from './pages/Upload';
import Analytics from './pages/Analytics';

type Page = 'catalog' | 'upload' | 'analytics';

const NAV: { key: Page; label: string }[] = [
  { key: 'catalog', label: 'Content' },
  { key: 'upload', label: 'Upload' },
  { key: 'analytics', label: 'Analytics' },
];

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [page, setPage] = useState<Page>('catalog');
  const [tenant, setTenant] = useState<TenantConfig | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoaded(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // White-label: the portal brands itself from the tenant's own config,
  // the same endpoint the consumer apps use.
  const tenantId = (session?.user.app_metadata?.tenant_id as string) ?? null;
  useEffect(() => {
    if (!tenantId) {
      setTenant(null);
      return;
    }
    fetch(`${SUPABASE_URL}/functions/v1/config?tenantId=${encodeURIComponent(tenantId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg: TenantConfig | null) => {
        if (cfg) {
          setTenant(cfg);
          if (cfg.theme?.accent) {
            document.documentElement.style.setProperty('--accent', cfg.theme.accent);
          }
        }
      })
      .catch(() => setTenant(null));
  }, [tenantId]);

  if (!sessionLoaded) return null;
  if (!session) return <Login />;

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 shrink-0 border-r border-neutral-800 flex flex-col">
        <div className="px-5 py-6 border-b border-neutral-800">
          <div className="text-lg font-semibold" style={{ color: 'var(--accent)' }}>
            {tenant?.name ?? 'Producer Portal'}
          </div>
          <div className="text-xs text-neutral-500 mt-1">Producer Portal</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => (
            <button
              key={item.key}
              onClick={() => setPage(item.key)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                page === item.key
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-neutral-800 text-xs text-neutral-500">
          <div className="truncate mb-2">{session.user.email}</div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-neutral-400 hover:text-white underline"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        {page === 'catalog' && <Catalog />}
        {page === 'upload' && <Upload onDone={() => setPage('catalog')} />}
        {page === 'analytics' && <Analytics />}
      </main>
    </div>
  );
}
