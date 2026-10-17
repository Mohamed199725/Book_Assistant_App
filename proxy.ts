import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// 1. Define which routes are public (like the sign-in page itself)
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)', 
  '/sign-up(.*)',
  '/api(.*)' // Keep API routes public if they handle their own auth
]);

export default clerkMiddleware(async (auth, req) => {
  // 2. If the route is NOT public, force a check.
  // This will automatically redirect unauthenticated users to the sign-in page.
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
