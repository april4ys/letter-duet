import { Dices } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";

type PostMarkdownProps = {
  content: string;
};

export function PostMarkdown({ content }: PostMarkdownProps) {
  const diceRoll = parseDiceRoll(content);

  if (diceRoll) {
    return <DicePost diceRoll={diceRoll} />;
  }

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

export function isDicePostContent(content: string) {
  return parseDiceRoll(content) !== null;
}

type DiceRoll = {
  notation: "1D6" | "2D6" | "1D10";
  total: number;
  values: number[];
};

type DicePostProps = {
  diceRoll: DiceRoll;
};

function DicePost({ diceRoll }: DicePostProps) {
  return (
    <div
      aria-label={`${diceRoll.notation} 주사위 결과 ${diceRoll.total}`}
      className="post-markdown dice-post"
    >
      <div className="dice-post-title">
        <Dices aria-hidden="true" size={19} strokeWidth={2.2} />
        <strong>{diceRoll.notation}</strong>
      </div>
      <div className="dice-post-calculation" aria-hidden="true">
        {diceRoll.values.map((value, index) => (
          <span className="dice-post-value-group" key={`${index}-${value}`}>
            {index > 0 ? <span className="dice-post-operator">+</span> : null}
            <span className="dice-post-value">{value}</span>
          </span>
        ))}
        {diceRoll.values.length > 1 ? (
          <>
            <span className="dice-post-operator">=</span>
            <strong className="dice-post-total">{diceRoll.total}</strong>
          </>
        ) : null}
      </div>
    </div>
  );
}

function parseDiceRoll(content: string): DiceRoll | null {
  const match = content.trim().match(
    /^::(1D6|2D6|1D10)=([0-9]+)(?:\+([0-9]+))?(?:=([0-9]+))?$/,
  );

  if (!match) {
    return null;
  }

  const notation = match[1] as DiceRoll["notation"];
  const values = [match[2], match[3]]
    .filter((value): value is string => Boolean(value))
    .map(Number);
  const expectedDiceCount = notation === "2D6" ? 2 : 1;
  const sides = notation === "1D10" ? 10 : 6;
  const total = values.reduce((sum, value) => sum + value, 0);
  const storedTotal = match[4] === undefined ? total : Number(match[4]);

  if (
    values.length !== expectedDiceCount ||
    values.some((value) => value < 1 || value > sides) ||
    storedTotal !== total ||
    (expectedDiceCount === 1 && match[4] !== undefined) ||
    (expectedDiceCount === 2 && match[4] === undefined)
  ) {
    return null;
  }

  return { notation, total, values };
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
