"use client";

const LETTERS = ["A", "B", "C", "D", "E"];

interface OptionCardProps {
  text: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  /** 0-based index — used to render the A/B/C/D letter badge */
  index?: number;
}

export default function OptionCard({
  text,
  selected,
  onClick,
  disabled = false,
  index,
}: OptionCardProps) {
  const letter = index !== undefined ? LETTERS[index] : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "option-card",
        selected ? "selected" : "",
        disabled ? "disabled" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {letter !== undefined && (
        <span className={`option-letter${selected ? " option-letter-selected" : ""}`}>
          {letter}
        </span>
      )}
      <span className="option-text">{text}</span>
    </button>
  );
}
