"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import toast from "react-hot-toast";

export default function AddMemberForm({ groupId }: { groupId: string }) {
  const [email, setEmail] = useState("");
  const router = useRouter();
  const { mutateAsync, isPending } = api.group.addMember.useMutation({
    onSuccess: () => {
      toast.success("User added to group");
      router.refresh();
      setEmail("");
    },
    onError: (error) => {
      toast.error("Something went wrong!");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutateAsync({ email, groupId });
  };

  return (
    <form onSubmit={handleSubmit} className="mb-10 flex max-w-[300px] gap-2">
      <Input
        type="email"
        value={email}
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
        disabled={isPending}
      />

      <Button type="submit" disabled={isPending}>
        {isPending ? "Adding..." : "Add"}
      </Button>
    </form>
  );
}
