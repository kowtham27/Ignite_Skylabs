/**
 * Markdown-lite for the board: **bold**, *italic* / _italic_, [links](https://…),
 * "- " and "1. " lists, paragraphs, and single line breaks.
 *
 * It parses into a small tree that React renders as elements. There is no
 * HTML path at all (no innerHTML), so a notice can't inject markup: anything
 * that isn't one of the patterns above is just text.
 */

export type Inline =
  | { t: "text"; text: string }
  | { t: "strong"; children: Inline[] }
  | { t: "em"; children: Inline[] }
  | { t: "link"; href: string; children: Inline[] };

export type Block =
  | { t: "p"; lines: Inline[][] }
  | { t: "ul"; items: Inline[][] }
  | { t: "ol"; items: Inline[][] };

const SAFE_HREF = /^(https?:\/\/|mailto:)/i;

type Rule = { re: RegExp; build: (m: RegExpExecArray) => Inline };

const RULES: Rule[] = [
  { re: /\*\*(.+?)\*\*/, build: (m) => ({ t: "strong", children: parseInline(m[1]!) }) },
  {
    re: /\[([^\]\n]+)\]\(([^)\s]+)\)/,
    build: (m) =>
      SAFE_HREF.test(m[2]!)
        ? { t: "link", href: m[2]!, children: parseInline(m[1]!) }
        : { t: "text", text: m[0] }, // javascript: and friends stay as plain text
  },
  { re: /(?<![*\w])\*(?![\s*])(.+?)(?<![\s*])\*(?!\*)/, build: (m) => ({ t: "em", children: parseInline(m[1]!) }) },
  { re: /(?<![\w])_(?!\s)(.+?)(?<!\s)_(?![\w])/, build: (m) => ({ t: "em", children: parseInline(m[1]!) }) },
];

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let rest = src;
  while (rest) {
    // Take whichever pattern starts earliest; ties go to the rule listed first.
    let best: { m: RegExpExecArray; rule: Rule } | null = null;
    for (const rule of RULES) {
      const m = rule.re.exec(rest);
      if (m && (!best || m.index < best.m.index)) best = { m, rule };
    }
    if (!best) {
      out.push({ t: "text", text: rest });
      break;
    }
    if (best.m.index > 0) out.push({ t: "text", text: rest.slice(0, best.m.index) });
    out.push(best.rule.build(best.m));
    rest = rest.slice(best.m.index + best.m[0].length);
  }
  return out;
}

const UL = /^\s*[-*•]\s+(.*)$/;
const OL = /^\s*\d+[.)]\s+(.*)$/;

export function parseBlocks(src: string): Block[] {
  const blocks: Block[] = [];
  let para: Inline[][] = [];
  let list: { t: "ul" | "ol"; items: Inline[][] } | null = null;

  const flushPara = () => {
    if (para.length) blocks.push({ t: "p", lines: para });
    para = [];
  };
  const flushList = () => {
    if (list) blocks.push(list);
    list = null;
  };

  for (const raw of src.replace(/\r\n?/g, "\n").split("\n")) {
    const ul = UL.exec(raw);
    const ol = ul ? null : OL.exec(raw);
    if (ul || ol) {
      const kind = ul ? "ul" : "ol";
      flushPara();
      if (!list || list.t !== kind) {
        flushList();
        list = { t: kind, items: [] };
      }
      list.items.push(parseInline((ul ?? ol)![1]!.trim()));
    } else if (raw.trim() === "") {
      flushPara();
      flushList();
    } else {
      flushList();
      para.push(parseInline(raw.trim()));
    }
  }
  flushPara();
  flushList();
  return blocks;
}

/** Visible words, in reading order. Diffs run on these, so highlights line up with what's rendered. */
export function wordsOf(nodes: Inline[], out: string[] = []): string[] {
  for (const n of nodes) {
    if (n.t === "text") out.push(...n.text.split(/\s+/).filter(Boolean));
    else wordsOf(n.children, out);
  }
  return out;
}

export function blockWords(blocks: Block[]): string[] {
  const out: string[] = [];
  for (const b of blocks) for (const line of b.t === "p" ? b.lines : b.items) wordsOf(line, out);
  return out;
}

/** Plain text, e.g. for the document title or a notification. */
export function plainText(src: string): string {
  return blockWords(parseBlocks(src)).join(" ");
}
