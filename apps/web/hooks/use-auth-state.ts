"use client";

import { useReducer, useState } from "react";
import { clearToken, getUser } from "@/lib/auth";

export function useAuthState() {
  const [loginOpen, setLoginOpen] = useState(false);
  // Bumps to force a re-render after logout, so the next render's getUser()
  // call (below) picks up the cleared token — clearToken() alone changes no
  // React state, so nothing would otherwise re-render.
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);

  const user = getUser();

  return {
    user,
    loginOpen,
    openLogin: () => setLoginOpen(true),
    setLoginOpen,
    // The form already called setToken(); this needs to force a re-render
    // the same way logout does, since setLoginOpen(false) is a no-op (and
    // re-renders nothing) when the dialog was never opened in the first
    // place — true for every LoginGate caller, not just LoginDialog's.
    onLoginSuccess: () => {
      setLoginOpen(false);
      forceUpdate();
    },
    logout: () => {
      clearToken();
      forceUpdate();
    },
  };
}
