import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Sign out. POST only — a GET would let any image or prefetch log the operator
 * out, and it mutates session state.
 *
 * This lives in a Route Handler because clearing the auth cookies requires
 * writing cookies, which a Server Component cannot do.
 */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/login", request.nextUrl.origin), {
    // 303: turn the POST into a GET for the redirect target.
    status: 303,
  });
}
