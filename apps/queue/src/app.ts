import { Hono } from "hono";
import { compress } from "hono/compress";
import { secureHeaders } from "hono/secure-headers";

import routes from "./routes";

import "./book-worker";
import "./page-worker";

const app = new Hono();

app.use(secureHeaders());
app.use(compress());

app.route("/", routes);

export default app;
