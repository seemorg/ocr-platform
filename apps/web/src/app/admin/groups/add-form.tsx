"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import toast from "react-hot-toast";

export default function AddGroupForm() {
  const [name, setName] = useState("");
  const router = useRouter();
  const { mutateAsync, isPending } = api.group.create.useMutation({
    onSuccess: () => {
      toast.success("Group created");
      router.refresh();
      setName("");
    },
    onError: (error) => {
      toast.error("Something went wrong!");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const preparedName = name.trim();
    if (!preparedName) return;
    mutateAsync({ name: preparedName });
  };

  return (
    <form onSubmit={handleSubmit} className="mb-10 flex max-w-[300px] gap-2">
      <Input
        type="text"
        value={name}
        placeholder="Name"
        onChange={(e) => setName(e.target.value)}
        disabled={isPending}
      />

      <Button type="submit" disabled={isPending}>
        {isPending ? "Adding..." : "Add"}
      </Button>
    </form>
  );
}
