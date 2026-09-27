import { cookies } from "next/headers";
import { GRANTS_COOKIE, grantsCookieOpts, loadGrants, sealGrants } from "@/lib/grants";
import { revokeToken } from "@/lib/idp";
import { cookieOpts } from "@/lib/session";

/** RFC 7009 token revocation endpoint. */
export async function POST(req: Request) {
  const jar = await cookies();
  const grants = await loadGrants(jar.get(GRANTS_COOKIE)?.value);
  const r = await revokeToken(new URLSearchParams(await req.text()), grants);
  jar.set(GRANTS_COOKIE, await sealGrants(grants), cookieOpts(grantsCookieOpts.maxAge));
  return r.ok ? new Response(null, { status: 200 }) : Response.json({ error: "invalid_client" }, { status: 401 });
}
