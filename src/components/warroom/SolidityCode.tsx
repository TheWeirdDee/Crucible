"use client";

import { Fragment, ReactNode } from "react";

/*
 * Minimal Solidity token highlighter — just enough that a patch reads as CODE.
 * Keeps strictly to the Crucible palette (FRONTEND.md): keywords in cognac,
 * types/literals in steel, function names emphasized in champagne, comments dim.
 * No external highlighter dependency — the snippets are small and self-contained.
 */

const KEYWORDS = new Set([
  "function", "external", "internal", "public", "private", "view", "pure",
  "payable", "returns", "return", "require", "emit", "if", "else", "for",
  "while", "mapping", "contract", "constructor", "modifier", "memory",
  "storage", "calldata", "pragma", "solidity", "import", "new", "true",
  "false", "this", "msg", "nonReentrant",
]);

const TYPES = new Set([
  "address", "uint", "uint256", "bool", "string", "bytes", "bytes32", "int",
  "int256",
]);

// comment | string | number | identifier | whitespace | single punctuation char
const TOKEN_RE =
  /(\/\/[^\n]*)|("(?:[^"\\]|\\.)*")|(\b\d+\b)|([A-Za-z_$][\w$]*)|(\s+)|([^\s])/g;

function highlightLine(line: string): ReactNode {
  const nodes: ReactNode[] = [];
  let key = 0;
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(line)) !== null) {
    const [, comment, str, num, word, ws, punct] = m;
    if (comment !== undefined) {
      nodes.push(
        <span key={key++} className="italic text-dim">
          {comment}
        </span>
      );
    } else if (str !== undefined) {
      nodes.push(
        <span key={key++} className="text-steel">
          {str}
        </span>
      );
    } else if (num !== undefined) {
      nodes.push(
        <span key={key++} className="text-steel">
          {num}
        </span>
      );
    } else if (word !== undefined) {
      const followedByParen = /^\s*\(/.test(line.slice(m.index + word.length));
      let cls = "text-champagne/85";
      if (KEYWORDS.has(word)) cls = "text-cognac";
      else if (TYPES.has(word)) cls = "text-steel";
      else if (followedByParen) cls = "font-medium text-champagne";
      nodes.push(
        <span key={key++} className={cls}>
          {word}
        </span>
      );
    } else if (ws !== undefined) {
      nodes.push(<Fragment key={key++}>{ws}</Fragment>);
    } else if (punct !== undefined) {
      nodes.push(
        <span key={key++} className="text-dim">
          {punct}
        </span>
      );
    }
  }
  return nodes;
}

export function SolidityCode({ code }: { code: string }) {
  const lines = code.replace(/\n+$/, "").split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 && "\n"}
          {highlightLine(line)}
        </Fragment>
      ))}
    </>
  );
}
