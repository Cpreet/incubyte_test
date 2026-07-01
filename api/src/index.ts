import { createServer } from "./server";

const server = createServer();
console.log(`API listening on http://localhost:${server.port}`);
