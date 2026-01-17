// services/pocketbaseAdapter.ts
import PocketBase from "pocketbase";
import type { Adapter, AdapterUser, AdapterAccount, AdapterSession } from "next-auth/adapters";

const pb = new PocketBase(process.env.POCKETBASE_URL || "http://localhost:8090");

// Helper: map PB user record to NextAuth AdapterUser
function pbToAdapterUser(record: any): AdapterUser {
  return {
    id: record.id,
    email: record.email,
    name: record.name ?? undefined,
    image: record.avatar ?? undefined,
    emailVerified: record.verified ? new Date(record.verified) : null,
    role: record.role, // custom field
    tenantId: record.tenantId, // custom field
    tenantRole: record.tenantRole, // custom field
  };
}

// Helper: map NextAuth AdapterUser to PB create payload
function adapterUserToPb(user: AdapterUser): any {
  return {
    email: user.email,
    name: user.name ?? null,
    avatar: user.image ?? null,
    verified: user.emailVerified ? user.emailVerified.toISOString() : null,
    role: (user as any).role ?? "user",
    tenantId: (user as any).tenantId ?? null,
  };
}

// Helper: map PB account (OAuth) to NextAuth AdapterAccount
function pbToAdapterAccount(record: any): AdapterAccount {
  return {
    id: record.id,
    userId: record.userId,
    type: record.type,
    provider: record.provider,
    providerAccountId: record.providerAccountId,
    access_token: record.accessToken,
    refresh_token: record.refreshToken,
    expires_at: record.expiresAt ? Math.floor(new Date(record.expiresAt).getTime() / 1000) : undefined,
    token_type: record.tokenType ?? undefined,
    scope: record.scope ?? undefined,
    id_token: record.idToken ?? undefined,
    session_state: record.sessionState ?? undefined,
  };
}

// Helper: map NextAuth AdapterAccount to PB create payload
function adapterAccountToPb(account: AdapterAccount): any {
  return {
    userId: account.userId,
    type: account.type,
    provider: account.provider,
    providerAccountId: account.providerAccountId,
    accessToken: account.access_token,
    refreshToken: account.refresh_token,
    expiresAt: account.expires_at ? new Date(account.expires_at * 1000).toISOString() : null,
    tokenType: account.token_type ?? null,
    scope: account.scope ?? null,
    idToken: account.id_token ?? null,
    sessionState: account.session_state ?? null,
  };
}

export default function PocketBaseAdapter(): Adapter {
  return {
    async createUser(user: Omit<AdapterUser, "id">) {
      const record = await pb.collection("users").create(adapterUserToPb(user as AdapterUser));
      return pbToAdapterUser(record);
    },
    async getUser(id: string) {
      try {
        const record = await pb.collection("users").getOne(id);
        return pbToAdapterUser(record);
      } catch {
        return null;
      }
    },
    async getUserByEmail(email: string) {
      try {
        const record = await pb.collection("users").getFirstListItem(`email="${email}"`);
        return pbToAdapterUser(record);
      } catch {
        return null;
      }
    },
    async getUserByAccount({ providerAccountId, provider }: { providerAccountId: string; provider: string }) {
      try {
        const account = await pb
          .collection("accounts")
          .getFirstListItem(`providerAccountId="${providerAccountId}" && provider="${provider}"`);
        const user = await pb.collection("users").getOne(account.userId);
        return pbToAdapterUser(user);
      } catch {
        return null;
      }
    },
    async updateUser(user: Partial<AdapterUser> & Pick<AdapterUser, "id">) {
      const payload = {
        name: user.name ?? null,
        avatar: user.image ?? null,
        verified: user.emailVerified ? user.emailVerified.toISOString() : null,
        role: (user as any).role,
        tenantId: (user as any).tenantId,
      };
      const record = await pb.collection("users").update(user.id, payload);
      return pbToAdapterUser(record);
    },
    async deleteUser(userId: string) {
      await pb.collection("users").delete(userId);
    },
    async linkAccount(account: AdapterAccount) {
      const payload = adapterAccountToPb(account);
      await pb.collection("accounts").create(payload);
    },
    async unlinkAccount({ providerAccountId, provider }: { providerAccountId: string; provider: string }) {
      try {
        const record = await pb
          .collection("accounts")
          .getFirstListItem(`providerAccountId="${providerAccountId}" && provider="${provider}"`);
        await pb.collection("accounts").delete(record.id);
      } catch {
        // No-op if not found
      }
    },
    async createSession({ sessionToken, userId, expires }: { sessionToken: string; userId: string; expires: Date }) {
      const record = await pb.collection("sessions").create({
        sessionToken,
        userId,
        expires: expires.toISOString(),
      });
      return { sessionToken: record.sessionToken, userId, expires };
    },
    async getSessionAndUser(sessionToken: string) {
      try {
        const sessionRecord = await pb
          .collection("sessions")
          .getFirstListItem(`sessionToken="${sessionToken}"`);
        const user = await pb.collection("users").getOne(sessionRecord.userId);
        return {
          session: {
            sessionToken: sessionRecord.sessionToken,
            userId: sessionRecord.userId,
            expires: new Date(sessionRecord.expires),
          },
          user: pbToAdapterUser(user),
        };
      } catch {
        return null;
      }
    },
    async updateSession({ sessionToken, expires }: Partial<AdapterSession> & Pick<AdapterSession, "sessionToken">) {
      try {
        const record = await pb
          .collection("sessions")
          .getFirstListItem(`sessionToken="${sessionToken}"`);
        await pb.collection("sessions").update(record.id, { expires: expires?.toISOString() });
        return {
          sessionToken: record.sessionToken,
          userId: record.userId,
          expires: expires || new Date(record.expires),
        };
      } catch {
        return null;
      }
    },
    async deleteSession(sessionToken: string) {
      try {
        const record = await pb
          .collection("sessions")
          .getFirstListItem(`sessionToken="${sessionToken}"`);
        await pb.collection("sessions").delete(record.id);
      } catch {
        // No-op if session not found
      }
    },
  };
}