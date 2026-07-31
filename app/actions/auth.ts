"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signupSchema, loginSchema } from "@/lib/validations/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordTermsAcceptance } from "@/lib/consent";

export async function login(formData: FormData) {
  const supabase = await createClient();

  // Server-side validation
  const data = Object.fromEntries(formData.entries());
  const result = loginSchema.safeParse(data);

  if (!result.success) {
    const error = result.error.issues[0]?.message || "VALIDATION_FAILED";
    return { error };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: result.data.email,
    password: result.data.password,
  });

  // Generic message: never reveal whether it was the email or the password
  // that was wrong (that difference is an account-enumeration oracle).
  if (error) return { error: "Invalid email or password." };

  revalidatePath("/", "layout");
  redirect("/events");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  // Server-side validation
  const data = Object.fromEntries(formData.entries());
  const result = signupSchema.safeParse(data);

  if (!result.success) {
    const error = result.error.issues[0]?.message || "VALIDATION_FAILED";
    return { error };
  }

  // Consent is enforced here as well as in the UI. The disabled button is an
  // affordance; anyone can POST to a server action directly, and an account
  // created without accepted terms is one we cannot show agreement for.
  if (formData.get("terms") !== "on") {
    return {
      error:
        "Please accept the Terms & Conditions and Privacy Policy to create an account.",
    };
  }

  const { data: signUpData, error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
  });

  // Generic message on failure: Supabase returns a distinct "User already
  // registered" error that would let an attacker enumerate which emails have
  // accounts. The neutral guidance below is shown for ANY signup failure, so
  // it confirms nothing about a specific address.
  if (error) {
    return {
      error:
        "We couldn't complete your sign up. If you already have an account, please sign in instead.",
    };
  }

  if (signUpData?.user?.id) {
    await recordTermsAcceptance(signUpData.user.id);
  }

  revalidatePath("/", "layout");
  redirect("/events");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function deleteAccountAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    return { error: error.message };
  }

  // Clear session on client/cookies
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function sendPasswordResetEmailAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { error: "Not authenticated" };
  }

  // Build the reset link from the trusted, server-configured app URL — NEVER
  // from the request Host header, which an attacker can spoof to point the
  // password-reset link at a domain they control (host-header poisoning).
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://crenelle.org";

  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${origin}/auth/callback?next=/settings/account`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
