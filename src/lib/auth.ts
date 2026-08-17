import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, roleHome, verifySession } from "@/lib/session";

export { SESSION_COOKIE, roleHome, signSession, verifySession } from "@/lib/session";

export async function getSession() {
  const cookieStore = await cookies();
  return verifySession(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function requireSession(roles?: UserRole[]) {
  const session = await getSession();
  if (!session) redirect("/");
  if (roles && !roles.includes(session.role)) redirect(roleHome(session.role));
  return session;
}

export async function getScopedUser(userId: string, schoolId: string) {
  return prisma.user.findFirst({
    where: { id: userId, schoolId, status: "ACTIVE" }
  });
}
