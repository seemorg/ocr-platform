"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DataCombobox from "@/components/data-combobox";
import { Button } from "@/components/ui/button";
import { appRouter } from "@/server/api/root";
import { api } from "@/trpc/react";
import { inferRouterOutputs } from "@trpc/server";
import toast from "react-hot-toast";

export default function AddMemberForm({ groupId }: { groupId: string }) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const router = useRouter();
  const utils = api.useUtils();
  const { mutateAsync, isPending } = api.group.addMember.useMutation({
    onSuccess: () => {
      toast.success("User added to group");
      router.refresh();
      setSelectedUser(null);
      utils.user.searchUsers.reset();
    },
    onError: (error) => {
      toast.error("Something went wrong!");
    },
  });

  const handleSubmit = () => {
    if (!selectedUser?.email) return;

    mutateAsync({ email: selectedUser.email, groupId });
  };

  return (
    <div className="mb-10 flex max-w-[400px] gap-2">
      <UsersCombobox
        selected={selectedUser}
        onSelect={setSelectedUser}
        groupId={groupId}
      />

      <Button type="button" disabled={isPending} onClick={handleSubmit}>
        {isPending ? "Adding..." : "Add"}
      </Button>
    </div>
  );
}

type User = inferRouterOutputs<typeof appRouter>["user"]["searchUsers"][number];

function UsersCombobox({
  selected,
  onSelect,
  groupId,
}: {
  selected: User | null;
  onSelect: (user: User | null) => void;
  groupId: string;
}) {
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const { data, isLoading, isError } = api.user.searchUsers.useQuery({
    query: debouncedSearchQuery,
    groupId,
  });

  return (
    <DataCombobox
      data={data}
      isLoading={isLoading}
      isError={isError}
      onQueryChange={setDebouncedSearchQuery}
      selected={selected}
      onChange={onSelect}
      itemName={(user) => user.name || user.email}
      messages={{
        placeholder: "Search for a user",
        loading: "Searching...",
        empty: "No users found",
        error: "Something went wrong",
      }}
      widthClassName="w-[350px]"
    />
  );
}
