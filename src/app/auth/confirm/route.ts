import { NextResponse, type NextRequest } from "next/server";

import { ensureAuthenticatedWorkspace } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");

  if (!tokenHash || type !== "email") {
    return redirectTo(request, "/login?error=confirmation");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

  if (error) {
    return redirectTo(request, "/login?error=confirmation");
  }

  try {
    await ensureAuthenticatedWorkspace();
  } catch {
    return redirectTo(request, "/login?error=workspace");
  }

  return redirectTo(request, "/dashboard");
}