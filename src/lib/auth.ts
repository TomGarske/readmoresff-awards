import type { AstroCookies } from "astro";
import { serverSupabase, adminSupabase } from "./supabase";

const SUPABASE_COOKIE_NAME = "sb-access-token";

export function getAccessTokenFromCookies(cookies: AstroCookies): string | undefined {
  return cookies.get(SUPABASE_COOKIE_NAME)?.value;
}

export function setAccessTokenCookie(cookies: AstroCookies, accessToken: string, maxAgeSec = 60 * 60 * 24 * 30) {
  cookies.set(SUPABASE_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSec,
  });
}

export function clearAccessTokenCookie(cookies: AstroCookies) {
  cookies.delete(SUPABASE_COOKIE_NAME, { path: "/" });
}

/**
 * Returns the authenticated user (or null). Uses the cookie-stored access token.
 */
export async function getCurrentUser(cookies: AstroCookies) {
  const token = getAccessTokenFromCookies(cookies);
  if (!token) return null;
  const supabase = serverSupabase(token);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

/**
 * Check whether an email belongs to an admin (configured via ADMIN_EMAILS env var, comma-separated).
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = import.meta.env.ADMIN_EMAILS ?? "";
  const allow = raw.split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean);
  return allow.includes(email.toLowerCase());
}

/**
 * Server-side gate: returns the user if they're an admin, otherwise null.
 */
export async function requireAdmin(cookies: AstroCookies) {
  const user = await getCurrentUser(cookies);
  if (!user) return null;
  if (!isAdminEmail(user.email)) return null;
  return user;
}
