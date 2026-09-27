import { NextResponse, type NextRequest } from "next/server";
import { errorRedirect, isAssigned, issueCode, type AuthRequest } from "@/lib/idp";
import { findClient } from "@/lib/clients";
import { DEMO_PASSWORD, findUser } from "@/lib/directory";
import { samlRespond, type SamlLoginRequest } from "@/lib/saml-idp";
import { IDP_SESSION_COOKIE, cookieOpts, issuerFor, originFrom, seal, unseal } from "@/lib/session";

export async function POST(req: NextRequest) {
  const origin = originFrom(req.headers, req.nextUrl.origin);
  const form = await req.formData();
  const sealed = String(form.get("req") ?? "");
  const data = await unseal<{ ar?: AuthRequest; saml?: SamlLoginRequest }>(sealed);
  if (!data) {
    const u = new URL("/idp/error", origin);
    u.searchParams.set("error", "invalid_request");
    u.searchParams.set("error_description", "The sign-in request expired (10 minutes). Start again from the vendor app.");
    return NextResponse.redirect(u, 303);
  }
  const { ar, saml } = data;

  if (form.get("action") === "cancel") {
    if (saml) return samlRespond(origin, saml, null, true);
    return NextResponse.redirect(errorRedirect(ar!, "access_denied", "The user cancelled sign-in."), 303);
  }

  const user = findUser(String(form.get("username") ?? ""));
  if (!user || form.get("password") !== DEMO_PASSWORD) {
    const u = new URL("/idp/login", origin);
    u.searchParams.set("req", sealed);
    u.searchParams.set("error", "Incorrect username or password. Hint: every demo password is \"demo\".");
    return NextResponse.redirect(u, 303);
  }

  const authTime = Math.floor(Date.now() / 1000);
  const amr = form.get("mfa") === "on" ? ["pwd", "mfa"] : ["pwd"];
  const session = await seal({ sub: user.sub, authTime, amr }, 8 * 3600);

  if (saml) {
    // SAML: answer with the auto-POST page directly (the Response goes to the app's ACS URL).
    const res = samlRespond(origin, saml, { user, authTime, amr });
    res.cookies.set(IDP_SESSION_COOKIE, session, cookieOpts(8 * 3600));
    return res;
  }
  const client = findClient(ar!.client_id)!;
  const res = isAssigned(user, client)
    ? NextResponse.redirect((await issueCode(ar!, issuerFor(origin), user.sub, authTime, amr)).redirect, 303)
    : NextResponse.redirect(
        errorRedirect(ar!, "access_denied", `${user.email} is not assigned to ${client.name} in the IdP.`),
        303,
      );
  // The IdP session is set even when the app is denied: authentication succeeded, authorization did not.
  res.cookies.set(IDP_SESSION_COOKIE, session, cookieOpts(8 * 3600));
  return res;
}
