import { jwks } from "@/lib/crypto";

export async function GET() {
  return Response.json(jwks(), {
    headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=300" },
  });
}
