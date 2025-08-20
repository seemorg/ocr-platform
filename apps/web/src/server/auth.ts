import type { DefaultSession, NextAuthOptions } from "next-auth";
import { cache } from "react";
import { env } from "@/env";
import { db } from "@/server/db";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { getServerSession } from "next-auth";
import { type Adapter } from "next-auth/adapters";
import EmailProvider from "next-auth/providers/email";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

const whitelistedEmails = ["sarmadhbokhari@gmail.com"];

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {
  // Include user.id on session
  callbacks: {
    session({ session, user, token }) {
      const id = user?.id || token?.sub;
      if (session.user && id) session.user.id = id;

      return session;
    },
    async signIn(user) {
      const email = user.profile?.email || user.user.email || "";

      // TODO: uncomment if we want to add whitelists
      // const whitelisted = await db.userWhitelist.findUnique({
      //   where: {
      //     email,
      //   },
      // });

      if (
        email.endsWith("@usul.ai") ||
        email.endsWith("@digitalseem.org") ||
        email.endsWith("@fifthtribe.com") ||
        whitelistedEmails.includes(email)
      ) {
        return true;
      }

      const whitelisted = await db.user.findUnique({
        where: {
          email,
        },
      });

      if (whitelisted) {
        return true;
      }

      return false;
    },
  },
  // @ts-ignore
  adapter: PrismaAdapter(db) as Adapter,
  session: {
    strategy: "jwt",
  },
  providers: [
    EmailProvider({
      server: {
        host: env.EMAIL_SERVER_HOST,
        port: env.EMAIL_SERVER_PORT,
        auth: {
          user: env.EMAIL_SERVER_USER,
          pass: env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: env.EMAIL_FROM,
      ...(env.NODE_ENV === "development"
        ? {
            sendVerificationRequest(params) {
              console.log(`LOGIN URL: ${params.url}`);
            },
          }
        : {}),
    }),
    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
};

/**
 * Wrapper for `getServerSession` so that you don't need to import the `authOptions` in every file.
 *
 * @see https://next-auth.js.org/configuration/nextjs
 */
export const getServerAuthSession = cache(() => getServerSession(authOptions));
