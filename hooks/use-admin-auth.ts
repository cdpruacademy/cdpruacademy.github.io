"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getSupabaseClient,
  isCurrentUserAdmin,
  signInAdmin,
  signOutAdmin,
} from "@/lib/supabase";

// Admin status comes from a real Supabase Auth session checked against public.admin_users.
// The server enforces it with RLS; this hook only decides what the UI shows.
export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const client = getSupabaseClient();

    const refresh = () => {
      isCurrentUserAdmin()
        .then((ok) => {
          if (isMounted) setIsAdmin(ok);
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
    async (password: string): Promise<{ success: boolean; error?: string }> => {
      const res = await signInAdmin(password);
      if (res.success) setIsAdmin(true);
      return res;
    },
    []
  );

  const logout = useCallback(async () => {
    await signOutAdmin();
    setIsAdmin(false);
  }, []);

  return {
    isAdmin,
    isAuthLoaded,
    login,
    logout,
  };
}
