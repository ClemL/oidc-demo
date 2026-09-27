import type { ReactNode } from "react";

/** Lightweight XML syntax colouring for display. Input should already be pretty-printed. */
function colour(line: string, key: number): ReactNode {
  const parts: ReactNode[] = [];
  const re = /(<\/?)([\w:.-]+)|([\w:.-]+)(=)("[^"]*")|(\/?>)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(line))) {
    if (m.index > last) parts.push(line.slice(last, m.index));
    if (m[2]) parts.push(m[1], <span key={i++} className="jwt-h">{m[2]}</span>);
    else if (m[3]) parts.push(<span key={i++} className="jwt-p">{m[3]}</span>, "=", <span key={i++} className="jwt-s">{m[5]}</span>);
    else parts.push(m[6]);
    last = re.lastIndex;
  }
  parts.push(line.slice(last));
  return <div key={key} className={/ds:Signature|ds:SignedInfo|ds:SignatureValue|ds:DigestValue|ds:X509/.test(line) ? "bg-accent/10" : undefined}>{parts}</div>;
}

export function XmlViewer({ xml, maxHeight = "32rem" }: { xml: string; maxHeight?: string }) {
  return (
    <pre className="code-block overflow-auto !whitespace-pre" style={{ maxHeight, wordBreak: "normal" }}>
      {xml.split("\n").map(colour)}
    </pre>
  );
}
