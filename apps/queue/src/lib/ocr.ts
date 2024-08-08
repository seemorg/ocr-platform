import { env } from "@/env";
import DocumentIntelligence, {
  getLongRunningPoller,
  isUnexpected,
} from "@azure-rest/ai-document-intelligence";
import { AzureKeyCredential } from "@azure/core-auth";
import { LRUCache } from "lru-cache";
import { PDFDocument } from "pdf-lib";
import { pdf as pdfToImg } from "pdf-to-img";

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
    pdfDoc = await PDFDocument.load(buffer, {
      ignoreEncryption: true,
    });
    cache.set(pdfUrl, pdfDoc);
  }

  return pdfDoc;
}

export async function getPdfPages(pdfUrl: string) {
  const pdfDoc = await getPdfDoc(pdfUrl);
  return pdfDoc.getPageCount();
}

export async function getPdfPage(pdfUrl: string, pageIndex: number) {
  const pdfDoc = await getPdfDoc(pdfUrl);

  // Create a new PDF document for the single page
  const singlePagePdf = await PDFDocument.create();

  // Copy the page from the original PDF to the new PDF
  const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [pageIndex]);
  singlePagePdf.addPage(copiedPage);

  // Serialize the single-page PDF document to a Uint8Array
  const pageUint8Array = await singlePagePdf.save();

  return pageUint8Array;
}

export async function getPdfPageAsImage(pdfUrl: string, pageNumber: number) {
  // Serialize the single-page PDF document to a buffer
  const pageUint8Array = await getPdfPage(pdfUrl, pageNumber - 1);

  let imgBuffer: Buffer | null = null;
  for await (const page of await pdfToImg(pageUint8Array, { scale: 2 })) {
    imgBuffer = page;
    break;
  }

  if (!imgBuffer) {
    return null;
  }

  return imgBuffer;
}

// This function does the following:
// 1. split the pdf to single pages
// 2. for each page, OCR using azure, convert to base64 image
// 3. yield the page number, text and image base64
export async function ocrPage(pdfUrl: string, pageIndex: number) {
  const pageUint8Array = await getPdfPage(pdfUrl, pageIndex);
  const singlePagePdfBytes = Buffer.from(pageUint8Array).toString("base64");

  let imgBase64 = "";
  for await (const page of await pdfToImg(pageUint8Array, { scale: 2 })) {
    imgBase64 = page.toString("base64");
    break;
  }

  const initialResponse = await client
    .path("/documentModels/{modelId}:analyze", "prebuilt-read")
    .post({
      contentType: "application/json",
      body: {
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
    throw {
      code: "OCR_FAILED",
      message: "Expected at least one document in the result.",
      response: pollResult,
    };
  }

  return {
    pageNumber: pageIndex + 1,
    text: analyzeResult.content,
    imageBase64: imgBase64,
  };
}
