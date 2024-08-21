/**
 * An extension that detects numbers and adds the option to convert them to arabic numbers using the intl.NumberFormat API or vise versa
 */
import { Extension } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    arabicNumbers: {
      /**
       * Set numbers to arabic numbers
       */
      setArabicNumbers: () => ReturnType;

      /**
       * Set numbers to english numbers
       */
      setEnglishNumbers: () => ReturnType;

      /**
       * Toggle between arabic and english numbers
       */
      toggleNumbers: () => ReturnType;
    };
  }
}

// Cache the INTL formatter for performance
let arabicFormatter: Intl.NumberFormat;
let englishFormatter: Intl.NumberFormat;

export const ArabicNumbers = Extension.create({
  name: "arabicNumbers",

  addCommands() {
    return {
      setArabicNumbers:
        () =>
        ({ tr, state }) => {
          const { doc, selection } = state;
          const { from, to } = selection;

          if (!arabicFormatter) {
            arabicFormatter = new Intl.NumberFormat("ar-EG", {
              useGrouping: false,
            });
          }

          let modified = false;

          doc.nodesBetween(from, to, (node, pos) => {
            if (node.isText) {
              const start = Math.max(from - pos, 0);
              const end = Math.min(to - pos, node.nodeSize);
              const selectedText = node.text?.slice(start, end);

              if (selectedText) {
                const newText = selectedText.replace(/\d+/g, (match) => {
                  modified = true;
                  return arabicFormatter.format(parseInt(match));
                });

                if (newText !== selectedText) {
                  tr.replaceWith(
                    pos + start,
                    pos + end,
                    state.schema.text(newText),
                  );
                }
              }
            }
          });

          return modified;
        },

      setEnglishNumbers:
        () =>
        ({ tr, state }) => {
          const { doc, selection } = state;
          const { from, to } = selection;

          if (!englishFormatter) {
            englishFormatter = new Intl.NumberFormat("en-US", {
              useGrouping: false,
            });
          }
          let modified = false;

          doc.nodesBetween(from, to, (node, pos) => {
            if (node.isText) {
              const start = Math.max(from - pos, 0);
              const end = Math.min(to - pos, node.nodeSize);
              const selectedText = node.text?.slice(start, end);
              if (selectedText) {
                const newText = selectedText?.replace(
                  /[\u0660-\u0669]+/g,
                  (match) => {
                    modified = true;
                    return englishFormatter.format(
                      parseInt(
                        match.replace(/[\u0660-\u0669]/g, (d) =>
                          String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48),
                        ),
                      ),
                    );
                  },
                );

                if (newText && newText !== selectedText) {
                  tr.replaceWith(
                    pos + start,
                    pos + end,
                    state.schema.text(newText),
                  );
                }
              }
            }
          });

          return modified;
        },

      toggleNumbers:
        () =>
        ({ state, commands }) => {
          const { doc, selection } = state;
          const { from, to } = selection;

          let hasArabicNumbers = false;
          let hasEnglishNumbers = false;

          doc.nodesBetween(from, to, (node, pos) => {
            if (node.isText) {
              const start = Math.max(from - pos, 0);
              const end = Math.min(to - pos, node.nodeSize);
              const selectedText = node.text?.slice(start, end);

              if (/[\u0660-\u0669]/.test(selectedText || "")) {
                hasArabicNumbers = true;
              }
              if (/\d/.test(selectedText || "")) {
                hasEnglishNumbers = true;
              }
              if (hasArabicNumbers && hasEnglishNumbers) {
                return false; // Stop iteration if both types are found
              }
            }
          });

          if (hasArabicNumbers) {
            return commands.setEnglishNumbers();
          } else if (hasEnglishNumbers) {
            return commands.setArabicNumbers();
          }

          return false; // No numbers detected, do nothing
        },
    };
  },
});

export default ArabicNumbers;
