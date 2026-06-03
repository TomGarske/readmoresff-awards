import type { APIRoute } from "astro";
import { setAccessTokenCookie } from "../../../lib/auth";

export const POST: APIRoute = async ({ request, cookies }) => {
  const { access_token } = await request.json().catch(() => ({}));
  if (!access_token || typeof access_token !== "string") {
    return new Response("Missing token", { status: 400 });
  }
  setAccessTokenCookie(cookies, access_token);
  return new Response("ok");
};
