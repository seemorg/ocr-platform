import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { useCreateUploadUrl } from "./useCreateUploadUrl";
import { useMergePdf } from "./useMergePdf";

function usePutFile() {
  const { isPending: isPuttingFile, mutateAsync: putFile } = useMutation({
    mutationFn: async ({ url, file }: { url: string; file: File }) =>
      fetch(url, {
        method: "PUT",
        body: file,
      }),
    onError: () => {
      toast.error("Could not upload file!");
    },
  });

  return { putFile, isPuttingFile };
}

export function useUploadPdfs() {
  const { isMerging, mergeFiles } = useMergePdf();
  const { createUploadUrl, isCreatingUploadUrl } = useCreateUploadUrl();
  const { putFile, isPuttingFile } = usePutFile();

  const uploadFiles = async (files: File[], fileName?: string | null) => {
    if (files.length === 0) {
      toast.error("No files uploaded");
      return;
    }

    if (!fileName) {
      toast.error("File name is required");
      return;
    }

    const { url, publicUrl } = await createUploadUrl({
      fileName,
    });

    let file: File | undefined;
    let splitsData: { start: number; end: number }[] | undefined;

    if (files.length > 1) {
      const { mergedPdf, splitsData: s } = await mergeFiles(files);
      file = new File([mergedPdf], fileName, { type: "application/pdf" });
      splitsData = s;
    } else {
      file = files[0]!;
    }

    await putFile({ url, file });

    return { url: publicUrl, splitsData };
  };

  const uploadFromUrl = async (targetUrl: string, fileName?: string | null) => {
    if (targetUrl.startsWith("https://assets.usul.ai/")) {
      return { url: targetUrl };
    }

    if (!fileName) {
      toast.error("File name is required");
      return;
    }
    // fetch and upload to our bucket
    const response = await fetch(targetUrl);

    // 'content-type' must be 'application/pdf'
    if (response.headers.get("content-type") !== "application/pdf") {
      toast.error("File is not a PDF");
      return;
    }

    const blob = await response.blob();
    const file = new File([blob], fileName, { type: "application/pdf" });
    const { url, publicUrl } = await createUploadUrl({ fileName });
    if (!url) return;

    await putFile({ url, file });

    return { url: publicUrl };
  };

  const isUploading = isCreatingUploadUrl || isPuttingFile || isMerging;

  return { uploadFiles, uploadFromUrl, isUploading };
}
