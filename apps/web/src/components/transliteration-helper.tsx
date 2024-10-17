import { api } from "@/trpc/react";
import toast from "react-hot-toast";

import { Button } from "./ui/button";
import Spinner from "./ui/spinner";

export default function TransliterationHelper({
  getText,
  setTransliteration,
  disabled,
}: {
  getText: () => string;
  setTransliteration: (text: string) => void;
  disabled?: boolean;
}) {
  const { mutateAsync, isPending } = api.openai.transliterateText.useMutation();

  const handleTransliterate = async () => {
    const text = getText().trim();

    if (!text) {
      toast.error("Arabic text is empty!");
      return;
    }

    const transliteration = await mutateAsync({ text });
    if (transliteration?.result) {
      setTransliteration(transliteration.result);
    } else {
      toast.error("Failed to auto-transliterate");
    }
  };

  return (
    <Button
      variant="link"
      size="sm"
      onClick={handleTransliterate}
      disabled={isPending || disabled}
      className="p-0"
      type="button"
    >
      Auto-transliterate {isPending && <Spinner size="2xs" className="ml-2" />}
    </Button>
  );
}
