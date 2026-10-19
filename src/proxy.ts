import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminUser, isBlocked, isCustomerUser } from "@/lib/auth/roles";

// Refreshes the Supabase session cookie on every request and does fast,
// optimistic redirects. Pages and server actions still check access themselves.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();
  const user = data.user && !isBlocked(data.user) ? data.user : null;
  const isAdmin = isAdminUser(user);
  const isCustomer = isCustomerUser(user);
  const path = request.nextUrl.pathname;

  // Only redirect page loads. Server actions are POST requests to the page's own
  // URL: the login forms call one right after signing in, and redirecting that
  // request (e.g. /admin/login → /admin) breaks the action, so the form signs
  // the user out again. Actions and pages check access themselves.
  if (request.method !== "GET" && request.method !== "HEAD") return response;

  // Redirect while keeping any refreshed session cookies.
  function redirectTo(pathname: string) {
    const target = NextResponse.redirect(new URL(pathname, request.url));
    response.cookies.getAll().forEach(c => target.cookies.set(c));
    return target;
  }

  if (path === "/admin/login") {
    if (isAdmin) return redirectTo("/admin");
    return response;
  }

  if (path === "/admin" || path.startsWith("/admin/")) {
    if (!user) return redirectTo("/admin/login");
    if (!isAdmin) return redirectTo("/admin/login?fel=behorighet");
    return response;
  }

  if (path === "/logga-in") {
    if (isAdmin) return redirectTo("/admin");
    if (isCustomer) return redirectTo("/konto");
    return response;
  }

  if (path === "/konto" || path.startsWith("/konto/")) {
    if (!user) return redirectTo(`/logga-in?next=${encodeURIComponent(path)}`);
    if (isAdmin) return redirectTo("/admin");
    if (!isCustomer) return redirectTo("/logga-in?fel=inaktivt");
    return response;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|avif|glb)$).*)"],
};
