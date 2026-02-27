import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';

/**
 * Auth.js v5 configuration — GitHub OAuth only.
 *
 * Scopes requested:
 *   read:user  — read the user's profile (name, avatar, email)
 *   user:email — access the user's email addresses
 *   repo       — read/write access to repos (needed for branch creation and PR)
 *
 * Callbacks:
 *   jwt     — embeds the GitHub OAuth access token into the JWT on first login
 *   session — exposes the GitHub token on the session object so the client can
 *             forward it to the NestJS server as a Bearer token
 *
 * The GitHub token is the single credential that authenticates the user with
 * both our API (as Bearer token) and GitHub's API (for repo operations).
 *
 * Full auth implementation (guard, user upsert, session types) happens in Chunk 3.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'read:user user:email repo',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // On first sign-in, account contains the OAuth access token
      if (account?.access_token) {
        token.githubToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose the GitHub token on the session for client-side use
      session.githubToken = token.githubToken as string | undefined;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});
