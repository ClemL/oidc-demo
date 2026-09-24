import { discovery } from "@/lib/idp";
import { issuerFor, originFrom } from "@/lib/session";

export async function GET(req: Request) {
  return Response.json(discovery(issuerFor(originFrom(req.headers))), {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}
