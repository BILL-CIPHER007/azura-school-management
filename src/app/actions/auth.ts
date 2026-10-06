"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import type { UserRole } from "@prisma/client";
import { getDemoPassword, schoolConfig } from "@/config/school";
import { recordAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, roleHome, signSession, verifySession } from "@/lib/auth";

export async function loginDemo(formData: FormData) {
  if (!schoolConfig.demo.isDemo || !schoolConfig.demo.quickAccessEnabled) redirect("/?erro=demo");

  const role = formData.get("role") as UserRole | null;
  if (!role || !schoolConfig.demo.users[role]) redirect("/?erro=perfil");

  const configuredUser = await prisma.user.findFirst({
    where: {
      email: schoolConfig.demo.users[role],
      role,
      status: "ACTIVE",
      school: { slug: schoolConfig.demo.schoolSlug }
    }
  });
  const user =
    configuredUser ??
    (await prisma.user.findFirst({
      where: {
        role,
        status: "ACTIVE",
        school: { slug: schoolConfig.demo.schoolSlug }
      },
      orderBy: { createdAt: "asc" }
    }));

  if (!user) redirect("/?erro=seed");

  const demoPassword = getDemoPassword();
  const validPassword = await bcrypt.compare(demoPassword, user.passwordHash);
  if (!validPassword) {
    await recordAuditLog(prisma, {
      schoolId: user.schoolId,
      actor: { id: user.id, role: user.role },
      source: "SYSTEM",
      action: "auth.login_failed",
      entity: "User",
      entityId: user.id,
      metadata: {
        role,
        reason: "invalid_demo_password",
        email: user.email
      }
    });
    redirect("/?erro=senha");
  }

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

  await recordAuditLog(prisma, {
    schoolId: user.schoolId,
    actor: { id: user.id, role: user.role },
    source: "SYSTEM",
    action: "auth.login_success",
    entity: "User",
    entityId: user.id,
    metadata: { role: user.role, mode: "demo" }
  });

  redirect(roleHome(user.role));
}

export async function logout() {
  const cookieStore = await cookies();
  const session = await verifySession(cookieStore.get(SESSION_COOKIE)?.value);
  if (session) {
    await recordAuditLog(prisma, {
      schoolId: session.schoolId,
      actor: session,
      source: "SYSTEM",
      action: "auth.logout",
      entity: "User",
      entityId: session.id,
      metadata: { role: session.role }
    });
  }
  cookieStore.delete(SESSION_COOKIE);
  redirect("/");
}
