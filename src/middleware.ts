import { NextRequest, NextResponse } from "next/server";

// Simple HTTP Basic Auth gate so the dashboard is private to you. Enforced only
// when APP_PASSWORD is configured (so a missing env var never locks you out).
// The cron endpoint (/api/screen) is excluded below and stays protected by its
// own CRON_SECRET, so scheduled runs keep working.
export function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();

  const user = process.env.APP_USER || "admin";
  const header = req.headers.get("authorization");

  if (header?.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const i = decoded.indexOf(":");
      const u = decoded.slice(0, i);
      const p = decoded.slice(i + 1);
      if (u === user && p === password) return NextResponse.next();
    } catch {
      /* fall through to 401 */
    }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Options Blow-Up Finder"' },
  });
}

export const config = {
  // Protect every route except the cron API, Next internals, and the favicon.
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico).*)"],
};
