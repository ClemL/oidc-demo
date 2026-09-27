import { cookies } from "next/headers";
import { GRANTS_COOKIE, grantsCookieOpts, loadGrants, sealGrants } from "@/lib/grants";
import { tokenRequest } from "@/lib/idp";
import { cookieOpts, issuerFor, originFrom } from "@/lib/session";

export async function POST(req: Request) {
  const form = new URLSearchParams(await req.text());

  // Support client_secret_basic as well as client_secret_post.
  const basic = req.headers.get("authorization");
  if (basic?.startsWith("Basic ")) {
    const [id, secret] = Buffer.from(basic.slice(6), "base64").toString().split(":");
    form.set("client_id", decodeURIComponent(id));
    form.set("client_secret", decodeURIComponent(secret ?? ""));
  }

  // A real IdP reads its grant store from a database; this demo keeps it in a cookie (see lib/grants.ts).
  const jar = await cookies();
  const grants = await loadGrants(jar.get(GRANTS_COOKIE)?.value);
  const result = await tokenRequest(form, issuerFor(originFrom(req.headers)), grants);
  jar.set(GRANTS_COOKIE, await sealGrants(grants), cookieOpts(grantsCookieOpts.maxAge));
  return Response.json(result.body, {
    status: result.ok ? 200 : result.status,
    headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
  });
}
