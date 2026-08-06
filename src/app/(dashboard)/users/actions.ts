"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  role: z.enum(["admin", "staff"]),
  isActive: z.enum(["on", "off"]),
});

export type ProfileActionState = { error?: string; success?: string };

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
