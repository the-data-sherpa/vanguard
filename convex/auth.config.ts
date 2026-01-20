export default {
  providers: [
    {
      // Set CLERK_JWT_ISSUER_DOMAIN in Convex Dashboard:
      // https://dashboard.convex.dev -> Settings -> Environment Variables
      // Value should be: https://your-app.clerk.accounts.dev
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN ?? "https://placeholder.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};
