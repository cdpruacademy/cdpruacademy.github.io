"use client";

import { useState, useEffect, useCallback } from "react";
import { DEFAULT_TAB_ACCESS, Role, TabAccess, canViewTab } from "@/lib/access";
import {
  fetchRole,
  fetchTabAccess,
  getCurrentRole,
  getSupabaseClient,
  signInAdmin,
  signOutAdmin,
} from "@/lib/supabase";

// The role comes from a real Supabase Auth session checked against public.user_roles.
// The server enforces it with RLS; this hook only decides what the UI shows.
export function useAdminAuth() {
  const [signedInRole, setRole] = useState<Role | null>(null);
  const [tabs, setTabs] = useState<TabAccess>(DEFAULT_TAB_ACCESS);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);
  const role = signedInRole;

  useEffect(() => {
    let isMounted = true;
    const client = getSupabaseClient();

    const refresh = () => {
      fetchRole()
        .then((next) => {
          if (isMounted) {
            setRole(next);
            setAuthFailed(false);
          }
          if (next && next !== "superadmin") {
            fetchTabAccess().then((t) => {
              if (isMounted && t) setTabs(t);
            });
          }
        })
        // Keep the role we have: a failed check is not a sign-out
        .catch(() => {
          if (isMounted) setAuthFailed(true);
        })
        .finally(() => {
          if (isMounted) setIsAuthLoaded(true);
        });
    };

    refresh();

    if (!client) return () => {
      isMounted = false;
    };

    // Keeps every component using this hook in step after login / logout / token refresh
    const { data } = client.auth.onAuthStateChange(() => {
      // Defer so the RPC does not run inside the auth callback lock
      setTimeout(refresh, 0);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      const res = await signInAdmin(email, password);
      if (res.success) setRole(await getCurrentRole());
      return res;
    },
    []
  );

  const logout = useCallback(async () => {
    await signOutAdmin();
    setRole(null);
  }, []);

  const canView = useCallback(
    (href: string) => (role ? canViewTab(href, role, tabs) : false),
    [role, tabs]
  );

  return {
    role,
    /** Can edit: superadmin or editor */
    isAdmin: role === "superadmin" || role === "editor",
    isSuperadmin: role === "superadmin",
    canView,
    isAuthLoaded,
    authFailed,
    login,
    logout,
  };
}
