function normalizeUrl(url: string): string {
  return url.replace(/\/$/, "");
}

function isLocalUrl(url: string): boolean {
  return url.includes("localhost") || url.includes("127.0.0.1");
}

function vercelAppUrl(): string | null {
  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionHost) {
    return normalizeUrl(`https://${productionHost}`);
  }

  const deploymentHost = process.env.VERCEL_URL?.trim();
  if (deploymentHost) {
    return normalizeUrl(`https://${deploymentHost}`);
  }

  return null;
}

/** Resolves the public app base URL for links, emails, and redirects. */
export function resolveAppUrl(request?: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const configuredUrl = configured ? normalizeUrl(configured) : null;
  const requestOrigin = request ? normalizeUrl(new URL(request.url).origin) : null;
  const vercelUrl = vercelAppUrl();

  if (configuredUrl && !isLocalUrl(configuredUrl)) {
    return configuredUrl;
  }

  if (vercelUrl) {
    return vercelUrl;
  }

  if (requestOrigin && !isLocalUrl(requestOrigin)) {
    return requestOrigin;
  }

  if (configuredUrl) {
    return configuredUrl;
  }

  if (requestOrigin) {
    return requestOrigin;
  }

  throw new Error(
    "App URL is not configured. Set NEXT_PUBLIC_APP_URL to your production domain."
  );
}

export function getInterviewPath(token: string): string {
  return `/interview/c/${token}`;
}

export function getInterviewLink(token: string, request?: Request): string {
  return `${resolveAppUrl(request)}${getInterviewPath(token)}`;
}
