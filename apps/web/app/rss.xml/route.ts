import { NextResponse } from "next/server";
import { getSiteUrl } from "../lib/siteConfig";

export function GET(request?: Request): NextResponse {
  const site = getSiteUrl();
  const target = new URL("/news/rss.xml", site);
  const res = NextResponse.redirect(target, 301);
  res.headers.set("Cache-Control", "public, max-age=3600");
  if (request?.method?.toUpperCase() === "HEAD") {
    return new NextResponse(null, { status: 301, headers: res.headers });
  }
  return res;
}

export function HEAD(request?: Request): NextResponse {
  return GET(request);
}

