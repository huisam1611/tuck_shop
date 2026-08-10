"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentProfile } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  role: z.enum(["admin", "staff"]),
  isActive: z.enum(["on", "off"]),
});

export type ProfileActionState = { error?: string; success?: string };

const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  name: z.string().trim().min(1, "Enter a name.").max(120, "Name is too long."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(72, "Password is too long."),
  role: z.enum(["admin", "staff"]),
});

export async function createUser(_previousState: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  const values = createUserSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!values.success) return { error: values.error.issues[0]?.message ?? "Check the user details." };

  try {
    const current = await getCurrentProfile();
    if (!current || current.role !== "admin" || !current.is_active) return { error: "Admin role required." };

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: values.data.email,
      password: values.data.password,
      email_confirm: true,
    });
    if (error || !data.user) {
      return { error: error?.message.toLowerCase().includes("already") ? "That email is already registered." : "Unable to create the Auth account." };
    }

    const { error: profileError } = await admin.from("profiles").insert({
      id: data.user.id,
      name: values.data.name,
      role: values.data.role,
      is_active: true,
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(data.user.id);
      return { error: "The Auth account was rolled back because its profile could not be created." };
    }

    revalidatePath("/users");
    return { success: `${values.data.name} was created as ${values.data.role}.` };
  } catch (error) {
    if (error instanceof Error && error.message === "SUPABASE_SECRET_KEY is not configured.") {
      return { error: "Add SUPABASE_SECRET_KEY to .env.local before creating users." };
    }
    return { error: "Unable to create the user. Check Supabase settings." };
  }
}

export async function updateProfile(_previousState: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  const values = profileSchema.safeParse({
    userId: formData.get("userId"),
    name: formData.get("name"),
    role: formData.get("role"),
    isActive: formData.get("isActive") === "on" ? "on" : "off",
  });
  if (!values.success) return { error: "Check the name, role, and active status." };

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("admin_update_profile", {
      p_user_id: values.data.userId,
      p_name: values.data.name,
      p_role: values.data.role,
      p_is_active: values.data.isActive === "on",
    });
    if (error) return { error: error.message };
    revalidatePath("/users");
    revalidatePath("/dashboard");
    return { success: "User updated." };
  } catch {
    return { error: "Users are not connected yet. Add Supabase settings to .env.local." };
  }
}
