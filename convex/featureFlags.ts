import { query } from "./_generated/server";

export const getRegisterEnabled = query({
  args: {},
  handler: async (ctx) => {
    // Check environment variable REGISTER_ENABLED
    // If not set or false, registration is disabled
    const registerEnabled = process.env.REGISTER_ENABLED;
    return registerEnabled === "true";
  },
});