import { Link } from "react-router-dom";

/**
 * Renders inline markdown: **bold** and [links](url)
 * Internal links (/articulo/...) use React Router <Link>
 * External links open in a new tab
 */
export function RichText({
  text,
  className,
  style,
}: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span className={className} style={style}>
      {parseInline(text)}
    </span>
  );
}

/** Parse a paragraph into React nodes with bold + links */
function parseInline(text: string): React.ReactNode[] {
  // Match **bold** or [text](url)
  const regex = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    // Text before this match
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[1] !== undefined) {
      // **bold**
      nodes.push(<strong key={key++}>{match[1]}</strong>);
    } else if (match[2] !== undefined && match[3] !== undefined) {
      // [text](url)
      const linkText = match[2];
      const url = match[3];
      const isInternal = url.startsWith("/");

      if (isInternal) {
        nodes.push(
          <Link
            key={key++}
            to={url}
            className="inline-link"
            style={{ color: "var(--blue)", textDecoration: "underline", textUnderlineOffset: 2 }}
          >
            {linkText}
          </Link>
        );
      } else {
        nodes.push(
          <a
            key={key++}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-link"
            style={{ color: "var(--blue)", textDecoration: "underline", textUnderlineOffset: 2 }}
          >
            {linkText}
          </a>
        );
      }
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last match
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

/** Render a multi-paragraph text with rich formatting */
export function RichParagraphs({
  text,
  className,
  style,
}: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <>
      {text.split("\n\n").map((p, i) => (
        <p key={i} className={className} style={style}>
          {parseInline(p)}
        </p>
      ))}
    </>
  );
}
