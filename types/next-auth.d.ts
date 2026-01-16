import type { DefaultSession, DefaultUser } from 'next-auth';
import type { DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: string;
      tenantId?: string;
      tenantRole?: string;
    } & DefaultSession['user'];
    tenantId?: string;
  }

  interface User extends DefaultUser {
    role: string;
    tenantId?: string;
    tenantRole?: string;
  }
}

declare module 'next-auth/adapters' {
  interface AdapterUser {
    role: string;
    tenantId?: string;
    tenantRole?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    role?: string;
    tenantId?: string;
    tenantRole?: string;
  }
}
