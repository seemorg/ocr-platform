export const parseLocalizedEntries = <
  T extends
    | { locale: string; text: string }
    | { locale: string; texts: string[] },
>(
  entries: T[],
): Record<string, "text" extends keyof T ? string : string[]> => {
  return entries.reduce(
    (acc, entry) => {
      if ("text" in entry) {
        (acc as Record<string, string>)[entry.locale] = entry.text;
      } else {
        (acc as Record<string, string[]>)[entry.locale] = entry.texts;
      }
      return acc;
    },
    {} as Record<string, "text" extends keyof T ? string : string[]>,
  );
};
