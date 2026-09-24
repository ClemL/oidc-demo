export default async function IdpError({ searchParams }: PageProps<"/idp/error">) {
  const sp = await searchParams;
  return (
    <div className="card mx-auto max-w-lg space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-bad">Identity provider error</p>
      <h1 className="font-mono text-lg">{String(sp.error ?? "error")}</h1>
      <p className="text-sm">{String(sp.error_description ?? "")}</p>
      <p className="text-xs text-muted">
        The IdP shows this itself instead of redirecting, because it cannot trust the redirect_uri of an invalid request
        (doing so would create an open redirect).
      </p>
    </div>
  );
}
