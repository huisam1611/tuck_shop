const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

async function check(path, expectedStatus) {
  const requestedUrl = new URL(path, baseUrl);
  const response = await fetch(requestedUrl, { redirect: "follow" });
  const finalUrl = new URL(response.url);
  const sameHost = finalUrl.hostname === requestedUrl.hostname;
  const loginRedirect = path === "/api/reports/export" && response.redirected && sameHost && finalUrl.pathname === "/login";
  const headers = {
    contentType: response.headers.get("content-type"),
    contentTypeOptions: response.headers.get("x-content-type-options"),
    frameOptions: response.headers.get("x-frame-options"),
    finalUrl: finalUrl.toString(),
    finalStatus: response.status,
  };

  if (response.status !== expectedStatus && !loginRedirect || path === "/login" && !sameHost) {
    throw new Error(`${path}: expected ${expectedStatus} on ${requestedUrl.origin}, received ${response.status} at ${finalUrl}`);
  }

  return { path, status: loginRedirect ? 302 : response.status, ...headers };
}

const checks = [
  await check("/login", 200),
  await check("/api/reports/export", 403),
];

for (const result of checks) {
  if (result.contentTypeOptions !== "nosniff" || result.frameOptions !== "DENY") {
    throw new Error(`${result.path}: required security headers are missing`);
  }
}

console.table(checks);
