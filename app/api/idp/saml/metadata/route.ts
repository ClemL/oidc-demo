import { idpMetadata } from "@/lib/saml";
import { originFrom } from "@/lib/session";

/** The file an admin uploads to the vendor: entity ID, SSO URL and signing certificate. */
export async function GET(req: Request) {
  return new Response(idpMetadata(originFrom(req.headers)), {
    headers: { "Content-Type": "application/samlmetadata+xml; charset=utf-8" },
  });
}
