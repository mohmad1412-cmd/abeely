import React from "react";

interface HighlightedTextProps {
  text: string;
  words: string[];
  className?: string;
  highlightClassName?: string;
}

/**
 * A component that highlights specific words within a text.
 * Case-insensitive matching.
 */
export const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  words,
  className = "",
  highlightClassName = "text-primary font-bold",
}) => {
  if (!words || words.length === 0 || !text) {
    return <span className={className}>{text}</span>;
  }

  // Escape special characters in radar words to avoid regex errors and filter empty strings
  const escapedWords = words
    .filter((w) => w && w.trim().length > 0)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  if (escapedWords.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Create a regex to match any of the radar words (case-insensitive)
  // Use \b to match whole words if possible, but for Arabic/mixed text,
  // sometimes simpler regex is better. Let's stick to simple for now.
  try {
    const regex = new RegExp(`(${escapedWords.join("|")})`, "gi");
    const parts = text.split(regex);

    return (
      <span className={className}>
        {parts.map((part, i) =>
          regex.test(part)
            ? (
              <span key={i} className={highlightClassName}>
                {part}
              </span>
            )
            : part
        )}
      </span>
    );
  } catch (error) {
    console.error("Regex error in HighlightedText:", error);
    return <span className={className}>{text}</span>;
  }
};

export default HighlightedText;
