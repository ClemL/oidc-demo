import { findUserBySub } from "@/lib/directory";
import { profileClaims, verifyAccessToken } from "@/lib/idp";
import { issuerFor, originFrom } from "@/lib/session";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return Response.json({ error: "invalid_token" }, { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
  }
  try {
    const at = await verifyAccessToken(auth.slice(7), issuerFor(originFrom(req.headers)));
    const user = findUserBySub(String(at.sub));
    if (!user) throw new Error("unknown subject");
    return Response.json({ sub: user.sub, ...profileClaims(user, String(at.scope).split(" ")) });
  } catch (e) {
    return Response.json(
      { error: "invalid_token", error_description: (e as Error).message },
      { status: 401, headers: { "WWW-Authenticate": 'Bearer error="invalid_token"' } },
    );
  }
}
