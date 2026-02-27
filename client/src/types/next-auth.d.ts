import 'next-auth';
import 'next-auth/jwt';

/**
 * Extends the Auth.js Session and JWT interfaces to include the GitHub OAuth
 * access token. This token is:
 *   - Embedded into the JWT on first sign-in (in auth.ts jwt callback)
 *   - Exposed on the session object (in auth.ts session callback)
 *   - Forwarded as Bearer token to NestJS on every API request
 *   - Used by NestJS to call GitHub API on behalf of the user
 */
declare module 'next-auth' {
  interface Session {
    githubToken?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    githubToken?: string;
  }
}
