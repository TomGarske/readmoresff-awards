import type { APIRoute } from "astro";
import { adminSupabase } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!email) return new Response("Missing email", { status: 400 });

  const supabase = adminSupabase();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${import.meta.env.SITE_URL ?? "https://readmoresff.org"}/auth/callback?next=/dashboard`,
    },
  });
  if (error) {
    console.error("OTP send failed", error);
    return new Response("Could not send link", { status: 500 });
  }
  return redirect("/login/sent", 303);
};
