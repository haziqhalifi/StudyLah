"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";

interface Props {
  children: string;
  className?: string;
  inline?: boolean;
}

/** Consume one brace-group starting at pos (must be `{`). Returns end index after `}`. */
function skipBraceGroup(s: string, pos: number): number {
  let depth = 0;
  for (let i = pos; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}") {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return s.length;
}

/**
 * Find the end of a LaTeX token starting at `pos` (which must be `\`).
 * Consumes the command name and any following {arg} or [arg] groups.
 */
function skipLatexToken(s: string, pos: number): number {
  // consume backslash + command name (letters) or single non-letter char
  let i = pos + 1;
  if (i >= s.length) return i;
  if (/[a-zA-Z]/.test(s[i])) {
    while (i < s.length && /[a-zA-Z]/.test(s[i])) i++;
  } else {
    i++; // single char like \\ or \,
  }
  // consume optional [opt] and {arg} groups
  while (i < s.length) {
    if (s[i] === "{") {
      i = skipBraceGroup(s, i);
    } else if (s[i] === "[") {
      const end = s.indexOf("]", i);
      i = end === -1 ? s.length : end + 1;
    } else {
      break;
    }
  }
  // consume bare ^2 or _2 that immediately follow
  while (i < s.length && (s[i] === "^" || s[i] === "_")) {
    i++;
    if (i < s.length && s[i] === "{") i = skipBraceGroup(s, i);
    else if (i < s.length && /\d/.test(s[i])) i++;
  }
  return i;
}

/**
 * Given text with no $ delimiters, find contiguous runs of LaTeX tokens
 * and return an array of {start, end, isLatex} segments.
 */
function segmentLatex(text: string): Array<{ start: number; end: number; isLatex: boolean }> {
  const segments: Array<{ start: number; end: number; isLatex: boolean }> = [];
  let i = 0;
  let plainStart = 0;

  while (i < text.length) {
    if (text[i] === "\\") {
      // flush any preceding plain text
      if (i > plainStart) segments.push({ start: plainStart, end: i, isLatex: false });

      // consume a run of LaTeX tokens (possibly with spaces/operators between them)
      let latexStart = i;
      let j = i;
      while (j < text.length) {
        if (text[j] === "\\") {
          j = skipLatexToken(text, j);
        } else if ((text[j] === "^" || text[j] === "_") && j + 1 < text.length) {
          j++;
          if (text[j] === "{") j = skipBraceGroup(text, j);
          else if (/\d/.test(text[j])) j++;
        } else if (/[\s=+\-*/,]/.test(text[j])) {
          // allow gaps of operators/spaces inside a LaTeX run only if next char is also LaTeX
          const peek = text.indexOf("\\", j);
          if (peek !== -1 && !/[a-zA-Z]/.test(text.slice(j, peek))) {
            j++;
          } else {
            break;
          }
        } else {
          break;
        }
      }
      segments.push({ start: latexStart, end: j, isLatex: true });
      plainStart = j;
      i = j;
    } else {
      i++;
    }
  }
  if (plainStart < text.length) {
    segments.push({ start: plainStart, end: text.length, isLatex: false });
  }
  return segments;
}

function normaliseMath(text: string): string {
  // Already has $ delimiters — just normalise \[...\] and \(...\) then done.
  if (/\$/.test(text)) {
    return text
      .replace(/\\\[([\s\S]*?)\\\]/g, (_m, i) => `$$${i}$$`)
      .replace(/\\\(([\s\S]*?)\\\)/g, (_m, i) => `$${i}$`);
  }

  // Wrap \begin{env}...\end{env} blocks as display math before anything else.
  // This handles matrices and other multi-line environments that segmentLatex can't parse.
  let out = text.replace(
    /\\begin\{([^}]+)\}([\s\S]*?)\\end\{\1\}/g,
    (_m, env, body) => `$$\\begin{${env}}${body}\\end{${env}}$$`
  );

  // Normalise \[...\] → $$...$$ and \(...\) → $...$
  out = out
    .replace(/\\\[([\s\S]*?)\\\]/g, (_m, i) => `$$${i}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_m, i) => `$${i}$`);

  if (/\$/.test(out)) return out;

  // Fix bare base-notation subscripts: 123_5 → 123_{5}
  out = out.replace(/(\d+)_(\d+)(?!\})/g, (_m, base, sub) => `${base}_{${sub}}`);

  const hasLatex = /\\[a-zA-Z]/.test(out);
  if (!hasLatex) return out;

  const segments = segmentLatex(out);

  // If every non-whitespace character is inside a LaTeX segment, wrap whole string.
  const plainText = segments
    .filter((s) => !s.isLatex)
    .map((s) => out.slice(s.start, s.end).replace(/[\s=+\-*/()[\]{},.:;!?^_\\<>|&0-9]/g, ""))
    .join("");
  const hasBareWords = /[a-zA-Z]/.test(plainText);

  if (!hasBareWords) {
    return `$${out}$`;
  }

  // Mixed: wrap only LaTeX segments.
  return segments
    .map(({ start, end, isLatex }) => {
      const chunk = out.slice(start, end);
      if (!isLatex) return chunk;
      return /\\begin\{/.test(chunk) ? `$$${chunk}$$` : `$${chunk}$`;
    })
    .join("");
}

export default function MathText({ children, className, inline = false }: Props) {
  const normalised = normaliseMath(children);
  const cls = ["math-text-responsive", className].filter(Boolean).join(" ");

  if (inline) {
    return (
      <span className={cls}>
        <ReactMarkdown
          remarkPlugins={[remarkMath, remarkGfm]}
          rehypePlugins={[rehypeKatex]}
          components={{ p: ({ children }) => <>{children}</> }}
        >
          {normalised}
        </ReactMarkdown>
      </span>
    );
  }

  return (
    <div className={cls}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
      >
        {normalised}
      </ReactMarkdown>
    </div>
  );
}
