import type { APIRoute } from "astro";
import { getCurrentUser, getAccessTokenFromCookies } from "../../../lib/auth";
import { serverSupabase } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const user = await getCurrentUser(cookies);
  if (!user) return new Response("Not signed in", { status: 401 });

  const form = await request.formData();
  const token = getAccessTokenFromCookies(cookies)!;
  const supabase = serverSupabase(token);

  const additionalRaw = String(form.get("additional_writers") ?? "");
  const additional = additionalRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const updates = {
    legal_name: String(form.get("legal_name") ?? "").trim() || null,
    pen_name: String(form.get("pen_name") ?? "").trim() || null,
    city: String(form.get("city") ?? "").trim() || null,
    country: String(form.get("country") ?? "").trim() || null,
    bio: String(form.get("bio") ?? "").trim() || null,
    personal_website: String(form.get("personal_website") ?? "").trim() || null,
    additional_writers: additional,
    timezone: String(form.get("timezone") ?? "").trim() || null,
    referred_by: String(form.get("referred_by") ?? "").trim() || null,
    newsletter_opt_in: form.get("newsletter_opt_in") === "1",
  };

  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
  if (error) {
    console.error("Profile save failed", error);
    return new Response("Could not save profile", { status: 500 });
  }
  return redirect("/dashboard", 303);
};
