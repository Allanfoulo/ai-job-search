import { convexAuth } from "@convex-dev/auth/server";
import { InvitedPassword } from "./invitedPassword";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    InvitedPassword(),
  ],
});
