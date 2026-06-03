import type { APIRoute } from "astro";
import { clearAccessTokenCookie } from "../../../lib/auth";

export const POST: APIRoute = async ({ cookies, redirect }) => {
  clearAccessTokenCookie(cookies);
  return redirect("/", 303);
};
