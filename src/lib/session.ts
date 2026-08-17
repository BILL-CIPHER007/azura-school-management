import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@prisma/client";

export const SESSION_COOKIE = "school_session";

export type SessionUser = {
  id: string;
  schoolId: string;
  name: string;
  email: string;
  role: UserRole;
};

function getAuthSecret() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be configured in production.");
  }
  return "desenvolvimento-local-troque-este-segredo";
}

const secret = new TextEncoder().encode(getAuthSecret());

export async function signSession(user: SessionUser) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
}

export async function verifySession(token?: string) {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as SessionUser;
  } catch {
    return null;
  }
}

export function roleHome(role: UserRole) {
  const homes: Record<UserRole, string> = {
    ADMIN: "/admin/dashboard",
    PROFESSOR: "/professor/dashboard",
    ALUNO: "/aluno/dashboard",
    RESPONSAVEL: "/responsavel/dashboard"
  };

  return homes[role];
}
