import { NextResponse, type NextRequest } from "next/server";
import { originFrom, sessionCookie, tokensCookie } from "@/lib/session";
import { isVendorId } from "@/lib/vendors";

/** Local logout: ends the vendor session only. The IdP session survives, so the next sign-in is silent. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/rp/[vendor]/logout">) {
  const { vendor } = await ctx.params;
  if (!isVendorId(vendor)) return new Response("Unknown vendor", { status: 404 });
  const res = NextResponse.redirect(new URL(`/vendors/${vendor}?loggedOut=local`, originFrom(req.headers, req.nextUrl.origin)));
  res.cookies.delete(sessionCookie(vendor));
  res.cookies.delete(tokensCookie(vendor));
  return res;
}
