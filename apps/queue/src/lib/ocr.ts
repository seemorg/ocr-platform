import DocumentIntelligence from "@azure-rest/ai-document-intelligence";
import {
  getLongRunningPoller,
  isUnexpected,
} from "@azure-rest/ai-document-intelligence";
import { PDFDocument } from "pdf-lib";
import { AzureKeyCredential } from "@azure/core-auth";
import { env } from "@/env";
import { pdf as pdfToImg } from "pdf-to-img";
import { LRUCache } from "lru-cache";

const client = (
  (DocumentIntelligence as any).default as typeof DocumentIntelligence
)(env.AZURE_OCR_ENDPOINT, new AzureKeyCredential(env.AZURE_OCR_KEY));

const cache = new LRUCache<string, PDFDocument>({
  max: 20, // Maximum number of items to store in the cache
  ttl: 60 * 60 * 1000 * 2, // 2 hour
});

async function getPdfDoc(pdfUrl: string) {
  let pdfDoc = cache.get(pdfUrl);
  if (!pdfDoc) {
    // Load the PDF document
    const buffer = await fetch(pdfUrl).then((res) => res.arrayBuffer());
    pdfDoc = await PDFDocument.load(buffer);
    cache.set(pdfUrl, pdfDoc);
  }

  return pdfDoc;
}

export async function getPdfPages(pdfUrl: string) {
  const pdfDoc = await getPdfDoc(pdfUrl);
  return pdfDoc.getPageCount();
}

// This function does the following:
// 1. split the pdf to single pages
// 2. for each page, OCR using azure, convert to base64 image
// 3. yield the page number, text and image base64
export async function ocrPage(pdfUrl: string, pageIndex: number) {
  const pdfDoc = await getPdfDoc(pdfUrl);

  // Create a new PDF document for the single page
  const singlePagePdf = await PDFDocument.create();

  // Copy the page from the original PDF to the new PDF
  const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [pageIndex]);
  singlePagePdf.addPage(copiedPage);

  // Serialize the single-page PDF document to a buffer
  const pageUint8Array = await singlePagePdf.save();
  const singlePagePdfBytes = Buffer.from(pageUint8Array).toString("base64");

  let imgBase64 = "";
  for await (const page of await pdfToImg(pageUint8Array)) {
    imgBase64 = page.toString("base64");
    break;
  }

  const initialResponse = await client
    .path("/documentModels/{modelId}:analyze", "prebuilt-read")
    .post({
      contentType: "application/json",
      body: {
        // urlSource: formUrl,
        base64Source: singlePagePdfBytes,
      },
    });

  if (isUnexpected(initialResponse)) {
    throw initialResponse.body.error;
  }

  const pollResult = await (
    await getLongRunningPoller(client, initialResponse)
  ).pollUntilDone();
  const { analyzeResult } = pollResult.body as {
    analyzeResult: {
      content: string;
    };
  };

  if (!analyzeResult) {
    console.log(pollResult);
    throw new Error("Expected at least one document in the result.");
  }

  return {
    pageNumber: pageIndex + 1,
    text: analyzeResult.content,
    imageBase64: imgBase64,
  };
}
