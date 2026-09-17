import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authMiddleware } from "./middleware/authMiddleware";

export function proxy(req: NextRequest) {
  const authResponse = authMiddleware(req);
  if (authResponse) return authResponse;
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*", "/onboarding", "/onboarding/:path*"],
};
