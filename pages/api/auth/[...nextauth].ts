// pages/api/auth/[...nextauth].ts
import NextAuth from "next-auth";
import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import EmailProvider from "next-auth/providers/email";
import FacebookProvider from "next-auth/providers/facebook";
import { getConfig } from "../../../services/config";
import PocketBaseAdapter from "../../../services/pocketbaseAdapter";

export const authOptions = async () => {
  const cfg = await getConfig();
  const facebookCreds = cfg.oauthCredentials.facebook || { clientId: "", clientSecret: "" };

  return {
    providers: [
      EmailProvider({
        server: { host: "localhost", port: 1025 },
        from: `no-reply@${cfg.resendDomain || "example.com"}`,
        async sendVerificationRequest({ identifier, url }) {
          const { sendMagicLink } = await import("../../../services/mailer");
          await sendMagicLink(identifier, url);
        },
      }),
      FacebookProvider({
        clientId: facebookCreds.clientId,
        clientSecret: facebookCreds.clientSecret,
        allowDangerousEmailAccountLinking: true,
      }),
    ],
    adapter: PocketBaseAdapter(),
    session: { strategy: "jwt" as const },
    callbacks: {
      async session({ session, token }: { session: Session; token: JWT }) {
        if (token.role) (session.user as any).role = token.role as string;
        if (token.tenantId) (session as any).tenantId = token.tenantId as string;
        if (token.tenantRole) (session as any).tenantRole = token.tenantRole as string;
        return session;
      },
      async jwt({ token, user }: { token: JWT; user?: any }) {
        if (user) {
          token.role = user.role;
          token.tenantId = user.tenantId;
          token.tenantRole = user.tenantRole;
        }
        return token;
      },
    },
  };
};

export default async function handler(req: any, res: any) {
  const options = await authOptions();
  return await NextAuth(req, res, options);
}