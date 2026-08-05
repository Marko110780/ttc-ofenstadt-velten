import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const port = Number(process.env.PORT ?? 5188);
const root = process.cwd();

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".ico", "image/x-icon"]
]);

function resolveRequestPath(requestUrl) {
  const parsedUrl = new URL(requestUrl ?? "/", `http://127.0.0.1:${port}`);
  const requestPath = parsedUrl.pathname === "/" ? "/public/index.html" : `/public${parsedUrl.pathname}`;
  const normalized = normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
  return join(root, normalized);
}

const server = createServer(async (request, response) => {
  try {
    const filePath = resolveRequestPath(request.url);
    const body = await readFile(filePath);
    response.writeHead(200, {
      "content-type": mimeTypes.get(extname(filePath)) ?? "application/octet-stream",
      "cache-control": "no-store"
    });
    response.end(body);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Datei nicht gefunden.");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log("");
  console.log("TTC Ofenstadt Velten Website laeuft lokal.");
  console.log(`Adresse: http://127.0.0.1:${port}`);
  console.log("");
  console.log("Dieses Fenster offen lassen, solange du die lokale Website nutzt.");
});
