import { stripHtml } from "string-strip-html";

const getWordsCount = (text?: string) => {
  if (!text) return 0;

  const strippedText = stripHtml(text).result;

  const words = strippedText.trim().match(/[\p{L}\p{M}\p{N}]+/gu);
  return words ? words.length : 0;
};

export function countPageWords({
  content,
  footnotes,
}: {
  content?: string;
  footnotes?: string;
}): number {
  return getWordsCount(content) + getWordsCount(footnotes);
}
