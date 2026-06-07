const baseUrl = (process.env.BASE_URL || "http://localhost:8080").replace(/\/$/, "");

const routes = [
  "/",
  "/login",
  "/cursos",
  "/dashboard",
  "/admin",
  "/admin/users",
  "/admin/enrollments",
  "/admin/content",
  "/admin/videoconferences",
  "/admin/roulette",
  "/admin/analytics",
];

async function main() {
  const failures = [];

  for (const route of routes) {
    const url = `${baseUrl}${route}`;
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 200 || response.status >= 400) {
        failures.push(`${route}: HTTP ${response.status}`);
      } else {
        console.log(`${route}: HTTP ${response.status}`);
      }
    } catch (error) {
      failures.push(`${route}: ${error.message}`);
    }
  }

  if (failures.length) {
    console.error("HTTP smoke checks failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log("HTTP smoke checks passed");
}

main();
