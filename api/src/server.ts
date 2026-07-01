export function handleRequest(request: Request) {
  const url = new URL(request.url);

  if (url.pathname === "/health") {
    return Response.json({ ok: true, service: "api" });
  }

  return Response.json({ message: "Hello via Bun!" });
}

export function createServer(port = Number(process.env.PORT ?? 8787)) {
  return Bun.serve({
    port,
    fetch: handleRequest,
  });
}
