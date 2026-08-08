const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

async function check(path, expectedStatus) {
  const response = await fetch(new URL(path, baseUrl), { redirect: "follow" });
  const finalPath = new URL(response.url).pathname;
  const loginRedirect = path === "/api/reports/export" && response.redirected && finalPath === "/login";
  const headers = {
    contentType: response.headers.get("content-type"),
    contentTypeOptions: response.headers.get("x-content-type-options"),
    frameOptions: response.headers.get("x-frame-options"),
    finalUrl: response.url,
    finalStatus: response.status,
  };

  if (response.status !== expectedStatus && !loginRedirect) {
    throw new Error(`${path}: expected ${expectedStatus} or a /login redirect, received ${response.status}`);
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
