// convex/convex.config.ts
import { defineApp } from "convex/server";
// import agent from "@convex-dev/agent/convex.config";
import r2 from "@convex-dev/r2/convex.config";
import resend from "@convex-dev/resend/convex.config";

const app = defineApp();
// app.use(agent);
app.use(r2);
app.use(resend);
export default app;
