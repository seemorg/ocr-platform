import { PDFDocument } from "@cantoo/pdf-lib";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";

const mergePdfAndGetSplits = async (files: File[]) => {
  const mergedPdf = await PDFDocument.create();
  const splitsData: { start: number; end: number }[] = [];
  let currentPage = 0;

  for (let file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer, {
      ignoreEncryption: true,
      password: "",
    });
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => {
      mergedPdf.addPage(page);
    });

    const start = currentPage + 1;
    const end = currentPage + copiedPages.length;
    splitsData.push({ start, end });
    currentPage = end;
  }

  return { mergedPdf: await mergedPdf.save(), splitsData };
};

export function useMergePdf() {
  const {
    isPending: isMerging,
    mutateAsync: mergeFiles,
    isError,
  } = useMutation({
    mutationFn: async (files: File[]) => mergePdfAndGetSplits(files),
    onError: () => {
      toast.error("Could not merge files!");
    },
  });

  return { isMerging, isError, mergeFiles };
}
