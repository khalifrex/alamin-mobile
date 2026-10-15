import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { errorMessage, fetchSession, post, type SessionAdmin, type SessionInfo, type SessionUser } from './api';

type SessionState = {
  ready: boolean;
  error: string | null;
  user: SessionUser | null;
  admin: SessionAdmin | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  adminSignOut: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [admin, setAdmin] = useState<SessionAdmin | null>(null);

  const apply = useCallback((s: SessionInfo) => { setUser(s.user); setAdmin(s.admin); setError(null); }, []);
  const fail = useCallback((e: unknown) => setError(errorMessage(e)), []);

  const refresh = useCallback(
    () => fetchSession().then(apply, fail).finally(() => setReady(true)),
    [apply, fail],
  );

  const signOut = useCallback(async () => {
    try { await post('auth.php', { action: 'logout' }); } finally { await refresh(); }
  }, [refresh]);

  const adminSignOut = useCallback(async () => {
    try { await post('admin_auth.php', { action: 'logout' }); } finally { await refresh(); }
  }, [refresh]);

  useEffect(() => {
    fetchSession().then(apply, fail).finally(() => setReady(true));
  }, [apply, fail]);

  return (
    <SessionContext.Provider value={{ ready, error, user, admin, refresh, signOut, adminSignOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionState {
  const s = useContext(SessionContext);
  if (!s) throw new Error('useSession must be used inside SessionProvider');
  return s;
}
