import type * as Party from "partykit/server";
import z from "zod";

// client sends a message either via WebSocket or HTTP
// { type: "join", userId: "123", email: "test@test.com", pageId: "123" }
const JoinSchema = z.object({
  type: z.literal("join"),
  userId: z.string(),
  email: z.string(),
  pageId: z.string(),
});

// server responds with an updated count of members
// { type: "update", total: 10, members: [{ userId: "123", email: "test@test.com" }] }
const UpdateSchema = z.object({
  type: z.literal("update"),
  total: z.number(),
  members: z.array(z.object({ userId: z.string(), email: z.string() })),
});

export const parseJoinMessage = (message: string) => {
  return JoinSchema.parse(JSON.parse(message));
};

export const createJoinMessage = (
  userId: string,
  email: string,
  pageId: string,
) => {
  return JSON.stringify(
    JoinSchema.parse({
      type: "join",
      userId,
      email,
      pageId,
    }),
  );
};

export const parseUpdateMessage = (message: string) => {
  return UpdateSchema.parse(JSON.parse(message));
};

export const createUpdateMessage = (
  total: number,
  members: { userId: string; email: string }[],
) => {
  return JSON.stringify(
    UpdateSchema.parse({
      type: "update",
      total,
      members,
    }),
  );
};

const json = (response: string) =>
  new Response(response, {
    headers: {
      "Content-Type": "application/json",
    },
  });

export default class ReactionServer implements Party.Server {
  options: Party.ServerOptions = { hibernate: true };
  constructor(readonly room: Party.Room) {}

  members: { userId: string; email: string; connectionId: string }[] = [];

  async onStart() {
    // load reactions from storage on startup
    this.members = (await this.room.storage.get("members")) ?? [];
  }

  async onRequest(req: Party.Request) {
    // for all HTTP requests, respond with the current reaction counts
    return json(createUpdateMessage(this.members.length, this.members));
  }

  onConnect(conn: Party.Connection) {
    // on WebSocket connection, send the current reaction counts
    conn.send(createUpdateMessage(this.members.length, this.members));
  }

  onMessage(message: string, sender: Party.Connection) {
    // client sends WebSocket message: update reaction count
    const parsed = parseJoinMessage(message);
    this.updateAndBroadcastMembers(parsed, sender);
  }

  updateAndBroadcastMembers(
    parsed: z.infer<typeof JoinSchema>,
    sender: Party.Connection,
  ) {
    // update stored reaction counts
    this.members.push({
      userId: parsed.userId,
      email: parsed.email,
      connectionId: sender.id,
    });

    // send updated counts to all connected listeners
    this.room.broadcast(createUpdateMessage(this.members.length, this.members));

    // save reactions to disk (fire and forget)
    this.room.storage.put("members", this.members);
  }

  onClose(conn: Party.Connection) {
    // Remove the disconnected member from the array
    const disconnectedMember = this.members.find(
      (member) => member.connectionId === conn.id,
    );
    if (disconnectedMember) {
      this.members = this.members.filter(
        (member) => member.connectionId !== conn.id,
      );

      // Broadcast the updated member list
      this.room.broadcast(
        createUpdateMessage(this.members.length, this.members),
      );

      // Update storage
      this.room.storage.put("members", this.members);
    }
  }
}

ReactionServer satisfies Party.Worker;
