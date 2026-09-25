import type { ReactNode } from "react";

// Tiny, safe markdown-ish renderer for advisor replies.
// Supports **bold**, line breaks and "- " / "1. " lists. Never uses dangerouslySetInnerHTML.

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter((part) => part !== "");
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={`${keyPrefix}-b-${index}`} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={`${keyPrefix}-t-${index}`}>{part}</span>;
  });
}

interface Block {
  type: "paragraph" | "ul" | "ol";
  lines: string[];
}

function isUnorderedItem(line: string): boolean {
  return /^-\s+/.test(line.trim());
}

function isOrderedItem(line: string): boolean {
  return /^\d+\.\s+/.test(line.trim());
}

function stripListMarker(line: string): string {
  return line.trim().replace(/^-\s+/, "").replace(/^\d+\.\s+/, "");
}

function buildBlocks(text: string): Block[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];

  for (const rawLine of lines) {
    const line = rawLine;
    if (line.trim() === "") {
      continue;
    }
    if (isUnorderedItem(line)) {
      const last = blocks[blocks.length - 1];
      if (last && last.type === "ul") {
        last.lines.push(stripListMarker(line));
      } else {
        blocks.push({ type: "ul", lines: [stripListMarker(line)] });
      }
    } else if (isOrderedItem(line)) {
      const last = blocks[blocks.length - 1];
      if (last && last.type === "ol") {
        last.lines.push(stripListMarker(line));
      } else {
        blocks.push({ type: "ol", lines: [stripListMarker(line)] });
      }
    } else {
      const last = blocks[blocks.length - 1];
      if (last && last.type === "paragraph") {
        last.lines.push(line);
      } else {
        blocks.push({ type: "paragraph", lines: [line] });
      }
    }
  }

  return blocks;
}

export function renderAdvisorMarkdown(text: string): ReactNode {
  const blocks = buildBlocks(text);

  return (
    <>
      {blocks.map((block, blockIndex) => {
        const key = `block-${blockIndex}`;
        if (block.type === "ul") {
          return (
            <ul key={key} className="list-disc pl-5 space-y-1">
              {block.lines.map((line, lineIndex) => (
                <li key={`${key}-${lineIndex}`}>
                  {renderInline(line, `${key}-${lineIndex}`)}
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === "ol") {
          return (
            <ol key={key} className="list-decimal pl-5 space-y-1">
              {block.lines.map((line, lineIndex) => (
                <li key={`${key}-${lineIndex}`}>
                  {renderInline(line, `${key}-${lineIndex}`)}
                </li>
              ))}
            </ol>
          );
        }
        return (
          <p key={key}>
            {block.lines.map((line, lineIndex) => (
              <span key={`${key}-${lineIndex}`}>
                {renderInline(line, `${key}-${lineIndex}`)}
                {lineIndex < block.lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        );
      })}
    </>
  );
}
