"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import type { UserRole } from "@prisma/client";
import { getDemoPassword, schoolConfig } from "@/config/school";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, roleHome, signSession } from "@/lib/auth";

export async function loginDemo(formData: FormData) {
  if (!schoolConfig.demo.isDemo || !schoolConfig.demo.quickAccessEnabled) redirect("/?erro=demo");

  const role = formData.get("role") as UserRole | null;
  if (!role || !schoolConfig.demo.users[role]) redirect("/?erro=perfil");

  const user = await prisma.user.findFirst({
    where: {
      email: schoolConfig.demo.users[role],
      role,
      status: "ACTIVE"
    }
  });

  if (!user) redirect("/?erro=seed");

  const demoPassword = getDemoPassword();
  const validPassword = await bcrypt.compare(demoPassword, user.passwordHash);
  if (!validPassword) redirect("/?erro=senha");

  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE,
    await signSession({
      id: user.id,
      schoolId: user.schoolId,
      name: user.name,
      email: user.email,
      role: user.role
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8
    }
  );

  redirect(roleHome(user.role));
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/");
}
