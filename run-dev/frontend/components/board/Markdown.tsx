import { Fragment } from "react";
import { parseBlocks, type Inline } from "@/lib/markdown";

/**
 * Renders markdown-lite as React elements (never HTML strings). Words listed
 * in `changed` get a soft amber highlight that fades out (.fresh). Words are
 * counted in the same order as `blockWords`, so the diff and the rendering
 * agree on which word is which.
 */
export function Markdown({ source, changed }: { source: string; changed?: Set<number> }) {
  const counter = { n: 0 };
  const blocks = parseBlocks(source);
  return (
    <div className="space-y-4 text-[16px] leading-[1.7] text-ink">
      {blocks.map((b, i) => {
        if (b.t === "p") {
          return (
            <p key={i}>
              {b.lines.map((line, j) => (
                <Fragment key={j}>
                  {j > 0 ? <br /> : null}
                  <Nodes nodes={line} changed={changed} counter={counter} />
                </Fragment>
              ))}
            </p>
          );
        }
        const List = b.t === "ul" ? "ul" : "ol";
        return (
          <List
            key={i}
            className={`space-y-1.5 pl-5 marker:text-muted ${b.t === "ul" ? "list-[square]" : "list-decimal marker:font-mono marker:text-[13px]"}`}
          >
            {b.items.map((item, j) => (
              <li key={j} className="pl-1">
                <Nodes nodes={item} changed={changed} counter={counter} />
              </li>
            ))}
          </List>
        );
      })}
    </div>
  );
}

function Nodes({ nodes, changed, counter }: { nodes: Inline[]; changed?: Set<number>; counter: { n: number } }) {
  return (
    <>
      {nodes.map((node, i) => {
        switch (node.t) {
          case "text":
            return <Words key={i} text={node.text} changed={changed} counter={counter} />;
          case "strong":
            return (
              <strong key={i} className="font-semibold">
                <Nodes nodes={node.children} changed={changed} counter={counter} />
              </strong>
            );
          case "em":
            return (
              <em key={i}>
                <Nodes nodes={node.children} changed={changed} counter={counter} />
              </em>
            );
          case "link":
            return (
              <a
                key={i}
                href={node.href}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-signal underline decoration-signal/40 underline-offset-4 hover:decoration-signal"
              >
                <Nodes nodes={node.children} changed={changed} counter={counter} />
              </a>
            );
        }
      })}
    </>
  );
}

/** Split into words and gaps; wrap changed words. */
export function Words({ text, changed, counter }: { text: string; changed?: Set<number>; counter: { n: number } }) {
  if (!changed?.size) {
    counter.n += text.split(/\s+/).filter(Boolean).length;
    return <>{text}</>;
  }
  return (
    <>
      {text.split(/(\s+)/).map((part, i) => {
        if (!part || /^\s+$/.test(part)) return part;
        const idx = counter.n++;
        return changed.has(idx) ? (
          <mark key={i} className="fresh">
            {part}
          </mark>
        ) : (
          part
        );
      })}
    </>
  );
}
