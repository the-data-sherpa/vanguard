import { defineApp } from "convex/server";
// @ts-expect-error - Convex component import requires bundler moduleResolution
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";

const app = defineApp();
app.use(rateLimiter);

export default app;
