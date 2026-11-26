// O teste do boneco do Jean (DEC-198, B-021 no central-sistema): ele anda pelo mesmo caminho da grade e sai pelas portas;
// nunca atravessa a parede. Do quarto até a calçada, o caminho passa pela porta; um ponto sem caminho não move o boneco e
// aparece um aviso curto ("não dá pra ir por aí").
// Como rodar: node scripts/testar_jean.mjs   (abre o jogo no modo de demonstração; sai com erro se algo não bater)
import { createRequire } from 'node:module'; const { chromium } = createRequire(import.meta.url)('playwright');
import { servir } from './servidor.mjs'; import { fileURLToPath } from 'node:url';
const s = await servir(fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '')); const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 390, height: 844 } });
const erros = []; pg.on('pageerror', (e) => erros.push(e.message));
await pg.goto(s.url + '/?demo=1#JG'); await pg.waitForTimeout(4000);
const r = await pg.evaluate(async () => {
  const M = await import('/jogo/cena.js'); window.jogoTeste.motor.atualizar = () => {};
  const c = window.jogoTeste.motor.jogo.scene.scenes[0]; const o = {};
  // Todo passo do caminho é um passo que a grade deixa dar (nenhuma parede atravessada).
  const passosOk = (g, de, pts) => { let a = M.celula(g, de); for (const p of pts) { const q = M.celula(g, p); if (!q || !a) return false;
    if (q[0] !== a[0] || q[1] !== a[1]) { if (Math.abs(q[0] - a[0]) + Math.abs(q[1] - a[1]) !== 1 || !g.pode(a[0], a[1], q[0], q[1])) return false; } a = q; } return true; };
  const cruzaY = (de, pts, y) => { let a = de; const xs = []; for (const p of pts) { if ((a.y - y) * (p.y - y) < 0) xs.push((a.x + p.x) / 2); a = p; } return xs; };
  // 1. A casa dela: do quarto (perto da cama) até a calçada da frente.
  let m = c.mapa; let g = M.grade(m); const porta = m.aberturas.find((x) => x.saida) || m.aberturas.find((x) => x.tipo === 'porta' && x.lado === 'n' && x.em[1] === m.fundo);
  const quarto = { x: 10.6, y: 7.6 }, calcada = { x: 3.5, y: m.fundo + 1.2 };
  let pts = M.caminho(g, quarto, calcada, true);
  o.pepper = { n: pts.length, passos: passosOk(g, quarto, pts), fim: pts.length ? pts[pts.length - 1] : null, cruza: cruzaY(quarto, pts, m.fundo), porta: porta ? [porta.em[0], porta.em[0] + porta.largura] : null };
  // 2. O boneco, de verdade: andar até a calçada; e um ponto sem caminho (longe, fora do mapa) não o move.
  const j = c.jean; c.camera = 'jean'; Object.assign(j, { visivel: true, x: quarto.x, y: quarto.y, andar: 0, caminho: [], preso: false });
  o.andou = c.andarJeanAte(calcada.x, calcada.y) && j.caminho.length > 0 && passosOk(g, quarto, j.caminho);
  j.caminho = []; j.x = quarto.x; j.y = quarto.y;
  o.semCaminho = c.andarJeanAte(80, 80) === false && j.caminho.length === 0 && j.x === quarto.x;
  await new Promise((ok) => setTimeout(ok, 300));
  o.aviso = /n[aã]o d[aá] pra ir por a[ií]/i.test(document.body.innerText);
  // 3. A casa do Jean (a de exemplo): de dentro da sala até a calçada, só pela porta.
  const ex = await (await fetch('/jogo/mapas/casa-exemplo.json')).json(); g = M.grade(ex); const pe = ex.aberturas.find((x) => x.saida);
  pts = M.caminho(g, { x: 1, y: 1 }, { x: 5, y: 6.5 }, true);
  o.jean = { n: pts.length, passos: passosOk(g, { x: 1, y: 1 }, pts), cruza: cruzaY({ x: 1, y: 1 }, pts, ex.fundo), porta: [pe.em[0], pe.em[0] + pe.largura] };
  return o;
});
await b.close(); s.fechar();
const f = [];
const pelaPorta = (x) => x.cruza.length > 0 && x.cruza.every((cx) => cx >= x.porta[0] && cx <= x.porta[1]);
if (!(r.pepper.n > 0 && r.pepper.passos && r.pepper.porta && pelaPorta(r.pepper))) f.push(`casa dela: do quarto à calçada, o caminho não saiu pela porta (${JSON.stringify(r.pepper)})`);
if (!r.andou) f.push('o boneco não andou até a calçada pelo caminho');
if (!r.semCaminho) f.push('um ponto sem caminho moveu o boneco');
if (!r.aviso) f.push('sem caminho, o aviso "não dá pra ir por aí" não apareceu');
if (!(r.jean.n > 0 && r.jean.passos && pelaPorta(r.jean))) f.push(`casa do Jean: o caminho não saiu pela porta (${JSON.stringify(r.jean)})`);
if (erros.length) f.push('erro de JavaScript: ' + erros.join('; '));
console.log(f.length ? 'Jean: ' + f.join('; ') : 'Jean: tudo certo');
process.exit(f.length ? 1 : 0);
