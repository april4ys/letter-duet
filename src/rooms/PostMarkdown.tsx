import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";

type PostMarkdownProps = {
  content: string;
};

export function PostMarkdown({ content }: PostMarkdownProps) {
  return (
    <div className="post-markdown">
      <ReactMarkdown
        allowedElements={[
          "p",
          "strong",
          "em",
          "a",
          "img",
          "br",
        ]}
        components={{
          a: ({ children, href }) => (
            <a href={href} rel="noreferrer" target="_blank">
              {children}
            </a>
          ),
          img: ({ alt, src }) =>
            isExternalUrl(src) ? <img alt={alt ?? ""} src={src} /> : null,
        }}
        remarkPlugins={[remarkBreaks]}
        skipHtml
      >
        {escapeUnsupportedMarkdown(content)}
      </ReactMarkdown>
    </div>
  );
}

function isExternalUrl(value: string | undefined) {
  return value?.startsWith("https://") || value?.startsWith("http://");
}

function escapeUnsupportedMarkdown(value: string) {
  return value
    .split("\n")
    .map((line) =>
      line
        .replace(/</g, "\\<")
        .replace(/`/g, "\\`")
        .replace(/^(#{1,6})(\s+)/, (match) => `\\${match}`)
        .replace(/^(\s{4,})/, (match) => match.replace(/ /g, "\\ "))
        .replace(/^(\s*)([-*_])\s*\2\s*\2\s*$/, "$1\\$2\\$2\\$2")
        .replace(/^(\s*)(={2,}|-{2,})(\s*)$/, "$1\\$2$3")
        .replace(/^(\s*)([-+*])(\s+)/, "$1\\$2$3")
        .replace(/^(\s*)(\d+)\.(\s+)/, "$1$2\\.$3")
        .replace(/^(\s*)>(\s?)/, "$1\\>$2")
        .replace(/^(\s*)\[([^\]]+)\]:/, "$1\\[$2]:"),
    )
    .join("\n");
}
