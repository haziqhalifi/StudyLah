"use client";

/**
 * MathText — renders markdown + LaTeX math from AI replies.
 *
 * Handles two sources:
 *   1. Question/option text from the DB: bare LaTeX without delimiters,
 *      e.g.  "Given s \times s = 6^{t}"  or  "100004_{5}"
 *   2. OpenAI markdown replies: may use $...$ or $$...$$ or \(...\) / \[...\]
 *
 * Strategy:
 *   - Normalise LaTeX delimiters so remark-math can parse them.
 *   - Only wrap bare LaTeX as $...$ when there's no markdown structure present,
 *     to avoid breaking AI markdown replies that happen to contain backslashes.
 *   - Render with ReactMarkdown + remark-math + rehype-katex.
 */

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";

interface Props {
  children: string;
  className?: string;
  inline?: boolean;
}

function normaliseMath(text: string): string {
  let out = text;

  // \[...\]  →  $$...$$  (display math)
  out = out.replace(/\\\[([\s\S]*?)\\\]/g, (_m, inner) => `$$${inner}$$`);

  // \(...\)  →  $...$   (inline math)
  out = out.replace(/\\\(([\s\S]*?)\\\)/g, (_m, inner) => `$${inner}$`);

  // Only wrap the whole thing as bare math when:
  //   - no $ delimiters already present
  //   - no markdown headings / bullets / code fences (i.e. it's plain math text)
  //   - the text looks like LaTeX (\cmd or ^{} or _{})
  const hasDollar = /\$/.test(out);
  const hasMarkdown = /^#{1,6}\s|^[-*]\s|^```|^\d+\.\s/m.test(out);
  const hasLatex = /\\[a-zA-Z]|[\^_]\{/.test(out);

  if (!hasDollar && !hasMarkdown && hasLatex) {
    out = `$${out}$`;
  }

  return out;
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
