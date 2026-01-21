import { NextRequest, NextResponse } from "next/server";
import { Id } from "@/convex/_generated/dataModel";
import { auth } from "@clerk/nextjs/server";

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

  // Parse state - contains tenantId and slug
  let tenantId: Id<"tenants">;
  let tenantSlug: string;
  try {
    const stateData = JSON.parse(state);
    tenantId = stateData.tenantId as Id<"tenants">;
    tenantSlug = stateData.slug;
  } catch {
    // Fallback for old format (just tenantId string)
    tenantId = state as Id<"tenants">;
    tenantSlug = "";
  }

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

    console.log(`[Facebook OAuth] Found ${pages.length} page(s) for user`);

    // If only one page, auto-connect it (legacy behavior)
    if (pages.length === 1) {
      const selectedPage = pages[0];
      const pageToken = selectedPage.access_token;
      const pageName = selectedPage.name;
      const pageId = selectedPage.id;

      console.log(`[Facebook OAuth] Auto-connecting single page: ${pageName}`);

      // Store the connection in Convex
      await saveConnectionViaHttp(tenantId, {
        pageId,
        pageName,
        pageToken,
        connectedBy: userId,
      });

      // Redirect back to settings with success
      return NextResponse.redirect(
        new URL(`/tenant/${tenantSlug}/settings/social?connected=true`, request.url)
      );
    }

    // Multiple pages - redirect to settings with pages data for selection modal
    // Encode pages as base64 JSON to pass safely in URL
    const pagesData = pages.map((p) => ({
      id: p.id,
      name: p.name,
      token: p.access_token,
    }));
    const encodedPages = Buffer.from(JSON.stringify(pagesData)).toString("base64");

    console.log(`[Facebook OAuth] Redirecting with ${pages.length} pages for selection`);

    // Redirect back to settings with pages for selection
    return NextResponse.redirect(
      new URL(
        `/tenant/${tenantSlug}/settings/social?pendingPages=${encodeURIComponent(encodedPages)}&connectedBy=${userId}`,
        request.url
      )
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

  const url = new URL("https://graph.facebook.com/v24.0/oauth/access_token");
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

  const url = new URL("https://graph.facebook.com/v24.0/oauth/access_token");
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
  const url = new URL("https://graph.facebook.com/v24.0/me/accounts");
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
  // Use Convex HTTP endpoint to save the connection
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL not configured");
  }

  // Convert .convex.cloud URL to .convex.site for HTTP actions
  const httpUrl = convexUrl.replace('.convex.cloud', '.convex.site');
  const endpoint = `${httpUrl}/facebook/connect`;

  console.log("[Facebook] Saving connection to:", endpoint);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tenantId,
      ...data,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Facebook] Failed to save connection:", response.status, errorText);
    throw new Error(`Failed to save Facebook connection: ${response.status}`);
  }

  const result = await response.json();
  console.log("[Facebook] Connection saved:", result);
}

