import fs from "fs";
import path from "path";
import { PDFDocument } from "@cantoo/pdf-lib";

import books from "./usul-books.json";

// import { db, usulDb } from "@/server/db";
// const unlinkedBooks = await db.book.findMany({
//   where: {
//     usulBookId: null,
//     arabicName: { not: null },
//   },
// });

// // find usul books that match the name
// const usulBooks = await usulDb.book.findMany({
//   where: {
//     OR: [
//       {
//         primaryNameTranslations: {
//           some: {
//             locale: "ar",
//             OR: unlinkedBooks.map((book) => ({
//               text: {
//                 mode: "insensitive",
//                 equals: book.arabicName!,
//               },
//             })),
//           },
//         },
//       },
//       {
//         otherNameTranslations: {
//           some: {
//             locale: "ar",
//             OR: unlinkedBooks.map((book) => ({
//               texts: {
//                 has: book.arabicName!,
//               },
//             })),
//           },
//         },
//       },
//     ],
//   },
//   select: {
//     id: true,
//     slug: true,
//     versions: true,
//     primaryNameTranslations: {
//       where: {
//         locale: "ar",
//       },
//     },
//     otherNameTranslations: {
//       where: {
//         locale: "ar",
//       },
//     },
//   },
// });

// const final = unlinkedBooks.map((book) => {
//   const usulBook = usulBooks.find(
//     (usulBook) =>
//       usulBook.primaryNameTranslations.some(
//         (translation) => translation.text === book.arabicName,
//       ) ||
//       usulBook.otherNameTranslations.some((translation) =>
//         translation.texts.includes(book.arabicName!),
//       ),
//   );

//   if (!usulBook) {
//     return {
//       arabicName: book.arabicName,
//       ocrUrl: `https://ocr.usul.ai/app/review/${book.id}`,
//     };
//   }

//   const pdfVersions = usulBook.versions.filter(
//     (version) => version.source === "pdf",
//   );

//   return {
//     id: book.id,
//     arabicName: book.arabicName,
//     ocrUrl: `https://ocr.usul.ai/app/review/${book.id}`,
//     internalUrl: `https://ocr.usul.ai/usul/texts/${usulBook?.id}/edit`,
//     usulId: usulBook.id,
//     pdfs: {
//       original: book.pdfUrl,
//       usul:
//         pdfVersions.length === 1
//           ? pdfVersions[0]!.value
//           : pdfVersions.map((v) => ({ id: v.id, url: v.value })),
//     },
//   };
// });

// console.log(
//   `Found ${final.filter((b) => b.usulId).length} / ${unlinkedBooks.length} books`,
// );

const loadDocument = async (pdfUrl: string) => {
  return fetch(pdfUrl)
    .then((res) => res.arrayBuffer())
    .then((buffer) =>
      PDFDocument.load(buffer, {
        ignoreEncryption: true,
        password: "",
      }),
    );
};

// validate number of pages
let i = 0;
for (const book of books) {
  console.log(`Checking ${++i} / ${books.length}`);

  if (!book.pdfs || typeof book.pdfs.usul !== "string") continue;

  const [originalPdf, usulPdf] = await Promise.all([
    loadDocument(book.pdfs.original),
    loadDocument(book.pdfs.usul),
  ]);

  if (originalPdf.getPageCount() !== usulPdf.getPageCount()) {
    console.log(`Does not match: `, book.arabicName);
  }
}

// write to file
// fs.writeFileSync(
//   path.resolve("usul-books.json"),
//   JSON.stringify(final, null, 2),
// );
