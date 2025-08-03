import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
// import Google from "@auth/core/providers/google";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";


export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      validatePasswordRequirements: (password: string) => {
        return true;
        // if (
        //   password.length < 8 ||
        //   !/\d/.test(password) ||
        //   !/[a-z]/.test(password) ||
        //   !/[A-Z]/.test(password)
        // ) {
        //   throw new ConvexError("Invalid password.");
        // }
      },
    }),
    // Google,
  ],
});


export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    return await ctx.db.get(userId);
  },
});