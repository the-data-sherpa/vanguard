import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { internal } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { auth } from "@clerk/nextjs/server";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Facebook OAuth callback handler
 *
 * Flow:
 * 1. User authorizes app on Facebook
 * 2. Facebook redirects here with authorization code
 * 3. Exchange code for user access token
 * 4. Get list of pages user manages
 * 5. Exchange user token for long-lived page token
 * 6. Store page token in tenant record
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // Contains tenant ID
  const error = searchParams.get("error");
  const errorReason = searchParams.get("error_reason");

  // Check for OAuth errors
  if (error) {
    console.error("[Facebook OAuth] Error:", error, errorReason);
    return NextResponse.redirect(
      new URL(`/error?message=${encodeURIComponent("Facebook authorization was denied")}`, request.url)
    );
  }

  if (!code || !state) {
    console.error("[Facebook OAuth] Missing code or state");
    return NextResponse.redirect(
      new URL("/error?message=Invalid callback parameters", request.url)
    );
  }

  const tenantId = state as Id<"tenants">;

  // Get the current user from Clerk
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(
      new URL("/sign-in?redirect_url=" + encodeURIComponent(request.url), request.url)
    );
  }

  try {
    // Exchange code for user access token
    const tokenResponse = await exchangeCodeForToken(code, request.url);
    if (!tokenResponse.access_token) {
      throw new Error("Failed to get access token from Facebook");
    }

    // Get long-lived token
    const longLivedToken = await getLongLivedToken(tokenResponse.access_token);

    // Get pages the user manages
    const pages = await getUserPages(longLivedToken.access_token);
    if (!pages || pages.length === 0) {
      return NextResponse.redirect(
        new URL("/error?message=No Facebook pages found. Please make sure you have admin access to a Facebook page.", request.url)
      );
    }

    // Use the first page (or could show a page selector)
    // TODO: Add page selection UI if user manages multiple pages
    const selectedPage = pages[0];

    // Get page access token (this is a long-lived token since we used long-lived user token)
    const pageToken = selectedPage.access_token;
    const pageName = selectedPage.name;
    const pageId = selectedPage.id;

    // Store the connection in Convex
    // Note: Using internal mutation requires server auth or system key
    // For now, we'll use an HTTP action or a special endpoint
    await saveConnectionViaHttp(tenantId, {
      pageId,
      pageName,
      pageToken,
      connectedBy: userId,
    });

    // Get tenant slug for redirect
    const tenant = await getTenantSlug(tenantId);

    // Redirect back to settings with success
    return NextResponse.redirect(
      new URL(`/tenant/${tenant?.slug || ""}/settings/social?connected=true`, request.url)
    );
  } catch (error) {
    console.error("[Facebook OAuth] Error:", error);
    return NextResponse.redirect(
      new URL(`/error?message=${encodeURIComponent("Failed to connect Facebook page")}`, request.url)
    );
  }
}

// Helper functions

async function exchangeCodeForToken(code: string, requestUrl: string) {
  const appId = process.env.FACEBOOK_APP_ID!;
  const appSecret = process.env.FACEBOOK_APP_SECRET!;
  const redirectUri = new URL("/api/auth/facebook/callback", requestUrl).origin + "/api/auth/facebook/callback";

  const url = new URL("https://graph.facebook.com/v18.0/oauth/access_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code", code);

  const response = await fetch(url.toString());
  if (!response.ok) {
    const error = await response.text();
    console.error("[Facebook] Token exchange failed:", error);
    throw new Error("Failed to exchange code for token");
  }

  return response.json();
}

async function getLongLivedToken(shortLivedToken: string) {
  const appId = process.env.FACEBOOK_APP_ID!;
  const appSecret = process.env.FACEBOOK_APP_SECRET!;

  const url = new URL("https://graph.facebook.com/v18.0/oauth/access_token");
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", shortLivedToken);

  const response = await fetch(url.toString());
  if (!response.ok) {
    const error = await response.text();
    console.error("[Facebook] Long-lived token exchange failed:", error);
    throw new Error("Failed to get long-lived token");
  }

  return response.json();
}

async function getUserPages(accessToken: string) {
  const url = new URL("https://graph.facebook.com/v18.0/me/accounts");
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("fields", "id,name,access_token");

  const response = await fetch(url.toString());
  if (!response.ok) {
    const error = await response.text();
    console.error("[Facebook] Get pages failed:", error);
    throw new Error("Failed to get user pages");
  }

  const data = await response.json();
  return data.data as Array<{ id: string; name: string; access_token: string }>;
}

async function saveConnectionViaHttp(
  tenantId: Id<"tenants">,
  data: {
    pageId: string;
    pageName: string;
    pageToken: string;
    connectedBy: string;
  }
) {
  // Use Convex HTTP client to call the internal mutation
  // This requires the Convex deployment to accept system-level calls
  // For now, we'll use a workaround with a special mutation

  const response = await fetch(`${process.env.NEXT_PUBLIC_CONVEX_URL}/api/mutation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Note: In production, you'd use a more secure method like
      // signed webhooks or an internal API key
    },
    body: JSON.stringify({
      path: "facebook:saveConnection",
      args: {
        tenantId,
        pageId: data.pageId,
        pageName: data.pageName,
        pageToken: data.pageToken,
        connectedBy: data.connectedBy,
      },
    }),
  });

  if (!response.ok) {
    // Fallback: Use HTTP endpoint on Convex
    // This will be set up in convex/http.ts
    const httpResponse = await fetch(`${process.env.NEXT_PUBLIC_CONVEX_URL?.replace('.convex.cloud', '.convex.site')}/facebook/connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tenantId,
        ...data,
      }),
    });

    if (!httpResponse.ok) {
      throw new Error("Failed to save Facebook connection");
    }
  }
}

async function getTenantSlug(tenantId: Id<"tenants">) {
  try {
    // Use Convex HTTP client
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_CONVEX_URL?.replace('.convex.cloud', '.convex.site')}/tenants/${tenantId}`
    );
    if (response.ok) {
      return response.json();
    }
  } catch {
    // Ignore errors, we'll redirect to a default location
  }
  return null;
}
