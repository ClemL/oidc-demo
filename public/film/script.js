// Timeline data: subtitles and chapters (seconds).
export const DURATION = 200;

export const CHAPTERS = [
  { t: 0, title: "Once upon a login" },
  { t: 12, title: "Too many passwords" },
  { t: 40, title: "The identity provider" },
  { t: 56, title: "Signing in to Aircall" },
  { t: 104, title: "The ID token" },
  { t: 120, title: "Single sign-on" },
  { t: 138, title: "Access denied" },
  { t: 151, title: "Joiners & leavers (SCIM)" },
  { t: 173, title: "Your turn" },
];

export const SUBTITLES = [
  [0.6, 5.6, "This is a short film about keys, passports, and one very busy pigeon."],
  [6.0, 11.6, "It explains single sign-on — and the lab on this page lets you try every step for real."],

  [12.6, 17.2, "Meet Alex. Alex works at Acme Rx and uses a lot of apps."],
  [17.5, 22.6, "Every app wants its own password. Alex is now up to seventeen."],
  [22.9, 27.8, "Most of them live on sticky notes. (Please don't tell Security.)"],
  [28.1, 33.4, "Worse: when someone leaves, their accounts quietly stay behind."],
  [33.7, 39.6, "Ghost accounts. Still paid for. Still able to log in."],

  [40.6, 45.4, "Single sign-on fixes this with one trusted place to prove who you are…"],
  [45.7, 50.6, "…the identity provider. In most offices, that's Microsoft Entra ID or Okta."],
  [50.9, 55.8, "Every app agrees to trust it, so no app ever needs Alex's password again."],

  [56.3, 61.0, "Let's follow Alex into Aircall. Alex clicks “Continue with SSO”."],
  [61.3, 66.0, "Aircall doesn't ask for a password. It hands Alex's browser — our pigeon — a sealed note."],
  [66.3, 70.0, "Inside: a random 'state' and a PKCE lock, so nobody can swap the note mid-flight."],
  [70.3, 75.0, "At the identity provider, Alex types a password and taps “Yes” on their phone."],
  [75.3, 80.0, "Then the guest list: is Alex assigned to Aircall? Yes."],
  [80.3, 85.8, "The browser gets a wristband — the IdP session. Remember it; it matters in a minute."],
  [86.3, 92.8, "The pigeon flies home with a claim ticket: a one-time code, useless on its own."],
  [93.3, 98.3, "Behind the scenes, Aircall trades that ticket through a private tube…"],
  [98.6, 103.8, "…which the browser never touches. Back comes the real prize: a signed ID token."],

  [104.3, 109.3, "The ID token is a passport: who Alex is, which app it's for, and when it expires."],
  [109.6, 114.6, "Aircall checks the wax seal against the provider's public key. Forgeries fail right here."],
  [114.9, 119.8, "Then it reads Alex's groups — App-Aircall-Admins — and makes Alex an admin."],

  [120.3, 125.0, "Later, Alex sails over to Lattice. Off goes the pigeon again…"],
  [125.3, 131.0, "…but the identity provider spots the wristband and stamps it straight away."],
  [131.3, 137.8, "No password. No phone prompt. That's the “single” in single sign-on."],

  [138.3, 143.5, "Meanwhile, Sam — a contractor — tries to get into Aircall."],
  [143.8, 150.8, "Sam isn't on Aircall's guest list, so the identity provider says no. Aircall never even sees Sam."],

  [151.3, 156.3, "Signing in is only half the job. The other half: who should have an account at all."],
  [156.6, 161.6, "With SCIM, the identity provider sets up accounts before a new hire's first day…"],
  [161.9, 167.0, "…and when someone leaves, it closes their accounts everywhere at once."],
  [167.3, 172.8, "One switch. No ghosts left behind."],

  [173.3, 179.0, "Small print: Aircall and Lattice speak SAML, OIDC's older cousin. Same idea, different envelope."],
  [179.3, 185.0, "Everything you just watched runs for real in this lab — tokens, checks, denials and all."],
  [185.3, 191.0, "Pick a user (the password is always “demo”), click any ? when you're curious, and try to break it."],
  [191.3, 193.4, "Your turn."],
];

export function subtitleAt(t) {
  const s = SUBTITLES.find(([a, b]) => t >= a && t < b);
  return s ? s[2] : "";
}

export function chapterAt(t) {
  let c = CHAPTERS[0];
  for (const ch of CHAPTERS) if (t >= ch.t) c = ch;
  return c;
}
