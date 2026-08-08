const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

async function check(path, expectedStatus) {
  const response = await fetch(new URL(path, baseUrl));
  const headers = {
    contentType: response.headers.get("content-type"),
    contentTypeOptions: response.headers.get("x-content-type-options"),
    frameOptions: response.headers.get("x-frame-options"),
  };

  if (response.status !== expectedStatus) {
    throw new Error(`${path}: expected ${expectedStatus}, received ${response.status}`);
  }

  return { path, status: response.status, ...headers };
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
