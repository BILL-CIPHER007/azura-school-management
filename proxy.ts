import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@prisma/client";
import { SESSION_COOKIE, roleHome, verifySession } from "@/lib/session";

const protectedRoutes: Array<{ prefix: string; role: UserRole }> = [
  { prefix: "/admin", role: "ADMIN" },
  { prefix: "/professor", role: "PROFESSOR" },
  { prefix: "/aluno", role: "ALUNO" },
  { prefix: "/responsavel", role: "RESPONSAVEL" }
];

export async function proxy(request: NextRequest) {
  const match = protectedRoutes.find((route) => request.nextUrl.pathname.startsWith(route.prefix));
  if (!match) return NextResponse.next();

  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.redirect(new URL("/", request.url));
  if (session.role !== match.role) {
    return NextResponse.redirect(new URL(roleHome(session.role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/professor/:path*", "/aluno/:path*", "/responsavel/:path*"]
};
