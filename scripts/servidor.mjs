// Um servidor estático mínimo para os testes do app (os módulos ES não abrem por file://).
// Usado por scripts/verificar_design.mjs e scripts/jornadas.mjs. Não roda sozinho.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';

const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.txt': 'text/plain; charset=utf-8' };

export function servir(raiz) {
  const s = createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const arq = normalize(join(raiz, p));
    if (!arq.startsWith(raiz)) { res.writeHead(403); res.end(); return; }
    try {
      const corpo = await readFile(arq);
      res.writeHead(200, { 'Content-Type': TIPOS[extname(arq)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(corpo);
    } catch (e) { res.writeHead(404); res.end(); }
  });
  return new Promise((ok) => s.listen(0, '127.0.0.1', () => ok({ url: `http://127.0.0.1:${s.address().port}`, fechar: () => s.close() })));
}
