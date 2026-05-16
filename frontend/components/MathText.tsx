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

// Regex: a token is "bare LaTeX" if it contains a backslash command, or
// superscript/subscript brace notation, and is NOT already wrapped in $…$.
// We wrap the whole segment between $ signs so remark-math processes it.
function normaliseMath(text: string): string {
  // Already has delimiters — leave as-is.
  if (/\$/.test(text)) return text;

  // Bare LaTeX signal: \cmd  OR  ^{  OR  _{
  if (/\\[a-zA-Z]|[\^_]\{/.test(text)) {
    // Wrap the entire string as a single inline math expression.
    return `$${text}$`;
  }

  return text;
}

export default function MathText({ children, className, inline = false }: Props) {
  const normalised = normaliseMath(children);
  const responsiveClass = [className, "math-text-responsive"].filter(Boolean).join(" ");

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
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {normalised}
      </ReactMarkdown>
    </div>
  );
}
