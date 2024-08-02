"use client";

import { useEffect, useState } from "react";
import { env } from "@/env";
import { Session } from "next-auth";
import PartySocket from "partysocket";

export default function Presence({
  pageId,
  session,
}: {
  pageId: string;
  session: Session;
}) {
  const [emails, setEmails] = useState<string[]>([]);

  useEffect(() => {
    const conn = new PartySocket({
      host: env.NEXT_PUBLIC_PARTYKIT_HOST,
      // party: "counter",
      room: pageId,
    });

    // Let's listen for when the connection opens
    conn.addEventListener("open", () => {
      // subscribe to updates for the links on this page
      conn.send(
        JSON.stringify({
          type: "join",
          userId: session.user.id,
          email: session.user.email,
          pageId: pageId,
        }),
      );
    });

    // You can even start sending messages before the connection is open!
    conn.addEventListener("message", (event) => {
      const data = JSON.parse(event.data) as {
        type: "update";
        total: number;
        members: { email: string; userId: string }[];
      };

      if (data.type === "update") {
        setEmails(
          data.members
            .map((m) => m.email)
            .filter((e) => e !== session.user.email),
        );
      }
    });

    return () => {
      conn.close();
    };
  }, []);

  if (emails.length === 0) return null;

  return (
    <div className="flex items-center gap-3">
      <span className="size-3 rounded-full bg-green-400" />

      {emails.length === 1 ? (
        <div>{emails[0]} is currently viewing or editing this page</div>
      ) : (
        <div>
          {emails.length} people are currently viewing or editing this page
        </div>
      )}
    </div>
  );
}
