import type { ReactNode } from "react";

type Token =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string }
  | { type: "link"; label: string; url: string; bold?: boolean };

function splitHighlight(text: string, query: string): ReactNode[] {
  if (!query) return [text];
  const q = query.toLowerCase();
  const src = text;
  const lower = src.toLowerCase();
  const out: ReactNode[] = [];
  let i = 0;
  while (true) {
    const idx = lower.indexOf(q, i);
    if (idx < 0) {
      const rest = src.slice(i);
      if (rest) out.push(rest);
      break;
    }
    const before = src.slice(i, idx);
    if (before) out.push(before);
    const match = src.slice(idx, idx + query.length);
    out.push(
      <span key={`hl_${idx}`} className="msg-hl">
        {match}
      </span>
    );
    i = idx + query.length;
  }
  return out;
}

function tokenizeLine(line: string): Token[] {
  // Order matters: **[text](url)**, [text](url), **bold**, *italic*
  const boldLinkRegex = /\*\*\[([^\]]+)\]\(([^)]+)\)\*\*/g;
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const boldRegex = /\*\*(.+?)\*\*/g;
  const italicRegex = /\*([^*]+?)\*/g;

  type Match = { start: number; end: number; kind: Token["type"] | "boldlink" | "link"; groups: string[] };
  const matches: Match[] = [];

  for (const m of line.matchAll(boldLinkRegex)) {
    if (m.index == null) continue;
    matches.push({ start: m.index, end: m.index + m[0].length, kind: "boldlink", groups: m.slice(1) });
  }
  for (const m of line.matchAll(linkRegex)) {
    if (m.index == null) continue;
    matches.push({ start: m.index, end: m.index + m[0].length, kind: "link", groups: m.slice(1) });
  }
  for (const m of line.matchAll(boldRegex)) {
    if (m.index == null) continue;
    matches.push({ start: m.index, end: m.index + m[0].length, kind: "bold", groups: m.slice(1) });
  }
  for (const m of line.matchAll(italicRegex)) {
    if (m.index == null) continue;
    matches.push({ start: m.index, end: m.index + m[0].length, kind: "italic", groups: m.slice(1) });
  }

  matches.sort((a, b) => a.start - b.start);

  // Remove overlaps
  const filtered: Match[] = [];
  for (const cur of matches) {
    const overlap = filtered.some((ex) => cur.start < ex.end && cur.end > ex.start);
    if (!overlap) filtered.push(cur);
  }

  const tokens: Token[] = [];
  let last = 0;
  for (const m of filtered) {
    if (last < m.start) tokens.push({ type: "text", value: line.slice(last, m.start) });

    if (m.kind === "boldlink") {
      const [label, url] = m.groups;
      tokens.push({ type: "link", label, url, bold: true });
    } else if (m.kind === "link") {
      const [label, url] = m.groups;
      tokens.push({ type: "link", label, url });
    } else if (m.kind === "bold") {
      tokens.push({ type: "bold", value: m.groups[0] });
    } else if (m.kind === "italic") {
      tokens.push({ type: "italic", value: m.groups[0] });
    }

    last = m.end;
  }

  if (last < line.length) tokens.push({ type: "text", value: line.slice(last) });
  return tokens;
}

export function renderMarkdown(text: string, opts?: { highlightQuery?: string }): ReactNode[] {
  const q = (opts?.highlightQuery ?? "").trim();
  const lines = text.split("\n");
  const out: ReactNode[] = [];

  lines.forEach((line, lineIdx) => {
    const tokens = tokenizeLine(line);
    tokens.forEach((t, idx) => {
      const key = `l${lineIdx}_t${idx}`;
      if (t.type === "text") {
        out.push(<span key={key}>{splitHighlight(t.value, q)}</span>);
      } else if (t.type === "bold") {
        out.push(
          <strong key={key} className="md-bold">
            {splitHighlight(t.value, q)}
          </strong>
        );
      } else if (t.type === "italic") {
        out.push(
          <em key={key} className="md-italic">
            {splitHighlight(t.value, q)}
          </em>
        );
      } else if (t.type === "link") {
        out.push(
          <a
            key={key}
            href={t.url}
            target="_blank"
            rel="noreferrer"
            className={t.bold ? "md-link md-linkBold" : "md-link"}
          >
            {splitHighlight(t.label, q)}
          </a>
        );
      }
    });
    if (lineIdx < lines.length - 1) out.push(<br key={`br_${lineIdx}`} />);
  });

  return out;
}


