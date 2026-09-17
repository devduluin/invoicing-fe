"use client";

import { useEffect, useState } from "react";
import { getCookie } from "@/utils/cookies";
import { readAppToken } from "@/utils/ssoCookies";

/**
 * Read-only view of the SSO session cookie. Login/cookie-writing is handled by
 * Launchpad — this app never sets `app_token` itself.
 */
export function useAppCookies() {
  const [appToken, setAppToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    setAppToken(readAppToken() || getCookie("app_token") || getCookie("APP_TOKEN"));
    setIsInitialized(true);
  }, []);

  return { appToken, isInitialized };
}
