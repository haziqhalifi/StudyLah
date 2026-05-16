"use client";

/**
 * MathText — renders a string that may contain LaTeX math.
 *
 * Handles two sources:
 *   1. Question/option text from the DB: uses raw LaTeX without delimiters,
 *      e.g.  "Given s \times s = 6^{t}"  or  "100004_{5}"
 *   2. Gemini markdown replies: may use $...$ or $$...$$ delimiters.
 *
 * Strategy:
 *   - Wrap any bare LaTeX expressions (containing \cmd or ^{} or _{}) that
 *     are NOT already inside $...$ with $...$ so remark-math picks them up.
 *   - Then render with ReactMarkdown + remark-math + rehype-katex.
 */

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

interface Props {
  children: string;
  className?: string;
  inline?: boolean; // true → render as inline span, false → block div
}

// Convert all LaTeX delimiter styles to $ / $$ so remark-math can parse them.
function normaliseMath(text: string): string {
  let out = text;

  // \[...\]  →  $$...$$  (display math)
  out = out.replace(/\\\[([\s\S]*?)\\\]/g, (_m, inner) => `$$${inner}$$`);

  // \(...\)  →  $...$   (inline math)
  out = out.replace(/\\\(([\s\S]*?)\\\)/g, (_m, inner) => `$${inner}$`);

  // If there are no $ delimiters at all but the text looks like bare LaTeX
  // (contains \cmd or ^{} or _{}) wrap the whole thing as inline math.
  if (!/\$/.test(out) && /\\[a-zA-Z]|[\^_]\{/.test(out)) {
    out = `$${out}$`;
  }

  return out;
}

export default function MathText({
  children,
  className,
  inline = false,
}: Props) {
  const normalised = normaliseMath(children);
  const responsiveClass = [className, "math-text-responsive"]
    .filter(Boolean)
    .join(" ");

  if (inline) {
    return (
      <span className={responsiveClass}>
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            // Suppress the wrapping <p> so inline math flows in-line
            p: ({ children }) => <>{children}</>,
          }}
        >
          {normalised}
        </ReactMarkdown>
      </span>
    );
  }

  return (
    <div className={responsiveClass}>
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {normalised}
      </ReactMarkdown>
    </div>
  );
}
