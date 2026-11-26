// O teste da abertura do jogo (conserto de 26/11, B-008 no central-sistema): o jogo é a janela de um mundo que já está
// rodando. Ao abrir, ela já está no lugar da atividade, na pose, sem caminhar; no meio de um trajeto, continua dali; só
// entra pela porta quando chega da rua; depois do segundo plano (mais de 2 minutos sem notícia), não recomeça da porta.
// E a simulação com semente: em 400 sequências de estados, nenhuma aparição começa na porta sem uma chegada de verdade.
// Como rodar: node scripts/testar_abertura.mjs   (abre o jogo no modo de demonstração; sai com erro se algo não bater)
import { createRequire } from 'node:module'; const { chromium } = createRequire(import.meta.url)('playwright');
import { servir } from './servidor.mjs'; import { fileURLToPath } from 'node:url';
const s = await servir(fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '')); const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 390, height: 844 } });
const erros = []; pg.on('pageerror', (e) => erros.push(e.message));
await pg.goto(s.url + '/?demo=1#JG'); await pg.waitForTimeout(4000);
const r = await pg.evaluate(() => {
  const c = window.jogoTeste.motor.jogo.scene.scenes[0]; const m = c.mapa; const porta = m.pontos.porta; const p = c.pepper;
  const itens = m.itens.filter((i) => !i.fora && !i.chao); const ids = itens.map((i) => i.id);
  const sofa = ids.find((i) => /sofa/.test(i)) || ids[0]; const cama = ids.find((i) => /cama/.test(i)) || ids[1];
  const naPorta = () => p.x === porta.x && p.y === porta.y;
  const reset = () => { p.visivel = false; p.estavaFora = undefined; p.saiuDoPrivado = false; p.alvo = null; p.caminho = []; p.x = porta.x; p.y = porta.y; c.vistaEm = 0; c.andar = 0; };
  const foto = () => ({ x: p.x, y: p.y, anda: p.caminho.length, vis: p.visivel, pose: p.pose, porta: naPorta() });
  const o = { dela: c.dela, sofa, cama };
  reset(); c.atualizar({ pepper: { objeto: sofa, pose: 'sentada' } }); o.abrirTv = foto();
  reset(); c.atualizar({ pepper: { objeto: cama, pose: 'deitada' } }); o.abrirDormindo = foto();
  // Um ponto do caminho de verdade (da porta ao sofá), para o trajeto.
  reset(); c.atualizar({ pepper: { fora: true } }); c.atualizar({ pepper: { objeto: sofa } }); const meio = p.caminho[Math.floor(p.caminho.length / 2)] || porta; o.meio = meio;
  reset(); c.atualizar({ pepper: { objeto: sofa, x: meio.x, y: meio.y } }); o.trajeto = foto();
  reset(); c.atualizar({ pepper: { fora: true } }); c.atualizar({ pepper: { objeto: sofa } }); o.daRua = foto();
  reset(); c.atualizar({ pepper: { objeto: sofa } }); c.vistaEm = Date.now() - 300000; c.atualizar({ pepper: { objeto: cama } }); o.segundoPlano = foto();
  reset(); c.atualizar({ pepper: { objeto: sofa } }); c.andar = 1; c.atualizar({ pepper: { objeto: sofa } }); c.andar = 0; c.atualizar({ pepper: { objeto: cama } }); o.voltouAoTerreo = foto();
  // A simulação com semente (mulberry32): estados ao acaso; toda aparição que começa na porta precisa de uma chegada.
  let a = 20261126; const rnd = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const falhas = [];
  for (let seq = 0; seq < 400; seq++) {
    reset(); let antes = null;
    for (let i = 0; i < 12; i++) {
      const x = rnd(); const st = x < 0.15 ? { fora: true } : x < 0.25 ? { privado: true } : { objeto: ids[Math.floor(rnd() * ids.length)] };
      if (rnd() < 0.1) c.vistaEm = Date.now() - 300000;
      const via = p.visivel; c.atualizar({ pepper: st });
      if (!via && p.visivel && p.caminho.length && naPorta() && !(antes && antes.fora)) falhas.push(`semente 20261126, sequência ${seq}, passo ${i}: começou na porta sem chegar da rua`);
      antes = st;
    }
  }
  o.simulacao = falhas.slice(0, 3);
  return o;
});
await b.close(); s.fechar();
const f = [];
if (!r.dela) f.push('a cena de demonstração não é a casa dela');
for (const [k, nome] of [['abrirTv', 'vendo TV'], ['abrirDormindo', 'dormindo']]) if (!r[k].vis || r[k].anda || r[k].porta) f.push(`ao abrir com ela ${nome}, ela não estava já no lugar (${JSON.stringify(r[k])})`);
if (r.abrirDormindo.pose !== 'deitada' && r.abrirDormindo.pose !== 'parada') f.push('dormindo, a pose não veio do lugar');
if (!(r.trajeto.x === r.meio.x && r.trajeto.y === r.meio.y && r.trajeto.anda > 0)) f.push('no meio de um trajeto, ela não continuou dali');
if (!(r.daRua.porta && r.daRua.anda > 0)) f.push('chegando da rua, ela não entrou pela porta');
if (r.segundoPlano.anda || r.segundoPlano.porta) f.push('ao voltar do segundo plano, ela caminhou ou recomeçou da porta');
if (r.voltouAoTerreo.porta) f.push('ao voltar ao térreo, ela recomeçou da porta');
f.push(...r.simulacao);
if (erros.length) f.push('erro de JavaScript: ' + erros.join('; '));
console.log(f.length ? 'Abertura: ' + f.join('; ') : 'Abertura: tudo certo (' + r.sofa + ', ' + r.cama + ')');
process.exit(f.length ? 1 : 0);
