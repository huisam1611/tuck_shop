"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export type LoginState = { error?: string };

export async function signIn(_previousState: LoginState, formData: FormData): Promise<LoginState> {
  const values = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!values.success) {
    return { error: values.error.issues[0]?.message ?? "Check your email and password." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(values.data);
    if (error) return { error: "Email or password is incorrect." };
  } catch {
    return { error: "Authentication is not configured yet. Add Supabase settings to .env.local." };
  }

  redirect("/dashboard");
}
