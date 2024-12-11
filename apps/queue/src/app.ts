import { Hono } from "hono";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";

import routes from "./routes";

import "./queues/book/worker";
import "./queues/page/worker";
import "./queues/upload/worker";

const app = new Hono();

app.use(
  secureHeaders({
    crossOriginResourcePolicy: "cross-origin",
  }),
);
app.use(compress());
app.use(cors());

app.route("/", routes);

export default app;
