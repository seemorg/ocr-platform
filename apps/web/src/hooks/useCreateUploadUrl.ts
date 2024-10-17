import { api } from "@/trpc/react";
import toast from "react-hot-toast";

export function useCreateUploadUrl() {
  const { isPending: isCreatingUploadUrl, mutateAsync: createUploadUrl } =
    api.upload.createUploadUrl.useMutation({
      onError: (error) => {
        if (error.data?.code === "CONFLICT") {
          toast.error("A file with the same name already exists");
        } else {
          toast.error("Could not create upload url!");
        }
      },
    });

  return { createUploadUrl, isCreatingUploadUrl };
}
