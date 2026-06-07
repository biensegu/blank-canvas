import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, relative, resolve } from "node:path";
import { Readable } from "node:stream";
import { pathToFileURL } from "node:url";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";
const rootDir = resolve(process.cwd());
const clientDir = join(rootDir, "dist", "client");
const serverEntry = join(rootDir, "dist", "server", "server.js");

if (!existsSync(serverEntry)) {
  console.error("Production build not found. Run `npm run build` before `npm run start`.");
  process.exit(1);
}

const serverBuild = await import(pathToFileURL(serverEntry).toString()).then((module) => module.default);

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

function isSafePath(filePath) {
  const rel = relative(clientDir, filePath);
  return rel && !rel.startsWith("..") && !rel.startsWith("/") && rel !== "";
}

async function tryServeStatic(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") return false;

  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const decodedPath = decodeURIComponent(url.pathname);
  const filePath = normalize(join(clientDir, decodedPath));
  if (!isSafePath(filePath)) return false;

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) return false;

    res.statusCode = 200;
    res.setHeader("content-length", fileStat.size);
    res.setHeader("content-type", contentTypes.get(extname(filePath)) ?? "application/octet-stream");

    if (req.url?.startsWith("/assets/")) {
      res.setHeader("cache-control", "public, max-age=31536000, immutable");
    }

    if (req.method === "HEAD") {
      res.end();
      return true;
    }

    createReadStream(filePath).pipe(res);
    return true;
  } catch {
    return false;
  }
}

function createWebRequest(req) {
  const protocol = req.headers["x-forwarded-proto"] ?? "http";
  const hostHeader = req.headers["x-forwarded-host"] ?? req.headers.host ?? `${host}:${port}`;
  const url = `${protocol}://${hostHeader}${req.url ?? "/"}`;
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else if (value !== undefined) {
      headers.set(key, value);
    }
  }

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  return new Request(url, {
    method: req.method,
    headers,
    body: hasBody ? Readable.toWeb(req) : undefined,
    duplex: hasBody ? "half" : undefined,
  });
}

async function sendWebResponse(res, webResponse) {
  res.statusCode = webResponse.status;
  res.statusMessage = webResponse.statusText;
  webResponse.headers.forEach((value, key) => res.setHeader(key, value));

  if (!webResponse.body) {
    res.end();
    return;
  }

  Readable.fromWeb(webResponse.body).pipe(res);
}

const server = createServer(async (req, res) => {
  try {
    if (await tryServeStatic(req, res)) return;

    const webRequest = createWebRequest(req);
    const webResponse = await serverBuild.fetch(webRequest, process.env, {});
    await sendWebResponse(res, webResponse);
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("Internal Server Error");
  }
});

server.listen(port, host, () => {
  console.log(`Production server listening on http://${host}:${port}`);
});
