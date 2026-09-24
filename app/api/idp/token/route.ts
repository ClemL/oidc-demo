import { exchangeCode } from "@/lib/idp";
import { issuerFor, originFrom } from "@/lib/session";

export async function POST(req: Request) {
  const form = new URLSearchParams(await req.text());

  // Support client_secret_basic as well as client_secret_post.
  const basic = req.headers.get("authorization");
  if (basic?.startsWith("Basic ")) {
    const [id, secret] = Buffer.from(basic.slice(6), "base64").toString().split(":");
    form.set("client_id", decodeURIComponent(id));
    form.set("client_secret", decodeURIComponent(secret ?? ""));
  }

  const result = await exchangeCode(form, issuerFor(originFrom(req.headers)));
  return Response.json(result.body, {
    status: result.ok ? 200 : result.status,
    headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
  });
}
