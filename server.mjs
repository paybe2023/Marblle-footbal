import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleConversionRequest } from './conversion-server.mjs';

const root = fileURLToPath(new URL('./dist/', import.meta.url));
const port = Number(process.env.PORT || 4173);
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.wasm':'application/wasm', '.png':'image/png', '.svg':'image/svg+xml' };

createServer(async (req, res) => {
  try {
    if (await handleConversionRequest(req,res)) return;
    const requested = decodeURIComponent((req.url || '/').split('?')[0]);
    let file = normalize(join(root, requested === '/' ? 'index.html' : requested.replace(/^\/+/, '')));
    if (!file.startsWith(normalize(root))) throw new Error('Invalid path');
    try { if ((await stat(file)).isDirectory()) file = join(file, 'index.html'); } catch { file = join(root, 'index.html'); }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch (error) {
    res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`Marble Football: http://127.0.0.1:${port}`));
