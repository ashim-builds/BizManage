import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirectTarget = new URL(`/auth/google/callback${url.search}`, request.url);
  return NextResponse.redirect(redirectTarget);
}
