import { Hono } from "hono";

import ocrRoutes from "./ocr";
import uiRoutes from "./ui";
import uptimeRoutes from "./uptime";

const routes = new Hono();

routes.route("/", ocrRoutes);
routes.route("/", uptimeRoutes);
routes.route("/", uiRoutes);

export default routes;
