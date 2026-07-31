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
    // The dialog already called setToken(); closing it re-renders this
    // component, and the getUser() call above naturally picks up the token.
    onLoginSuccess: () => setLoginOpen(false),
    logout: () => {
      clearToken();
      forceUpdate();
    },
  };
}
