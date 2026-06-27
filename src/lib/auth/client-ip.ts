export function getClientIp(request: Request): string {
  // On Vercel, x-vercel-forwarded-for is set by the platform edge and cannot be
  // spoofed by the client (incoming x-vercel-* headers are stripped). Prefer it
  // so IP-based rate limits and lockouts can't be bypassed with a forged
  // X-Forwarded-For header.
  const vercelForwarded = request.headers.get("x-vercel-forwarded-for");
  if (vercelForwarded) {
    return vercelForwarded.split(",")[0]?.trim() || "unknown";
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  // Fallback for non-Vercel / local environments. X-Forwarded-For is
  // client-influenced, so this is the least-trusted source.
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return "unknown";
}
