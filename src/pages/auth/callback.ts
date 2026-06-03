import type { APIRoute } from "astro";
import { setAccessTokenCookie } from "../../lib/auth";

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  // Supabase magic-link redirects here with the access token in the URL fragment;
  // the browser strips the fragment from server requests, so we render a tiny page
  // that pulls the token from the URL and posts it back to set a cookie.
  const html = `<!doctype html>
<html><head><title>Signing in…</title></head>
<body style="font-family:system-ui;background:#0e1117;color:#e6edf3;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
<div>
  <h2>Signing you in…</h2>
  <p id="msg">Working…</p>
</div>
<script>
(async function () {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const access = hash.get("access_token");
  const refresh = hash.get("refresh_token");
  const next = new URLSearchParams(window.location.search).get("next") || "/dashboard";
  if (!access) {
    document.getElementById("msg").textContent = "No access token in URL.";
    return;
  }
  const res = await fetch("/api/auth/set-session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ access_token: access, refresh_token: refresh }),
  });
  if (res.ok) {
    window.location.replace(next);
  } else {
    document.getElementById("msg").textContent = "Sign-in failed.";
  }
})();
</script>
</body></html>`;
  return new Response(html, { headers: { "content-type": "text/html" } });
};
