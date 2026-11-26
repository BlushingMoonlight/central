// O teste da rotina no app (o par da parte B, DEC-188 a DEC-190 no central-sistema): o app desenha o que o workflow 68
// manda. Ela anda pela rota do servidor (sem pular), faz o desvio e volta, esmaece quando o vigia a leva; a Morgan chega
// da escola pela porta e sai por ela; as visitas chegam e vão embora pela porta; a fumaça, o vapor, o celular (na mão e no
// criado-mudo), o que ela leva andando, o prato na mesa e a cena genérica da TV aparecem; todo balão que o 68 manda tem desenho.
// Independente do relógio (o conserto de 26/11 no central #26): a demonstração troca de atividade a cada 25 s pelo relógio
// de verdade, então cada caso começa do zero (sem o "acabou de sair do banheiro"), e o tempo do jogo passa por conta do
// teste, quadro a quadro, com a cena parada: nada depende de a máquina ser rápida ou lenta, nem da hora em que roda.
// Como rodar: node scripts/testar_rotina.mjs   (abre o jogo no modo de demonstração; sai com erro se algo não bater)
import { createRequire } from 'node:module'; const { chromium } = createRequire(import.meta.url)('playwright');
import { servir } from './servidor.mjs'; import { fileURLToPath } from 'node:url';
import { tipoDePrograma, restoDaRota, projetar } from '../jogo/cena.js';
const f = [];
// as contas da rota, sem o navegador
const r0 = [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }];
if (Math.abs(projetar(r0, 2, 1) - 3) > 1e-9) f.push('projetar: o ponto no meio do segundo trecho não deu 3');
const resto = restoDaRota(r0, 1); if (!(resto.length === 3 && resto[0].x === 1 && resto[0].y === 0)) f.push('restoDaRota: andado 1, não começou em (1, 0)');
if (restoDaRota(r0, 5).length) f.push('restoDaRota: rota acabada ainda tinha pontos');
for (const [p, t] of [['Fórmula 1', 'esporte'], ['Videogame', 'videogame'], ['Desenho', 'desenho'], ['Jornal', 'noticia'], ['Série', 'serie'], [null, 'serie']]) if (tipoDePrograma(p) !== t) f.push(`a TV com "${p}" não virou ${t}`);

const s = await servir(fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '')); const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 390, height: 844 } });
const erros = []; pg.on('pageerror', (e) => erros.push(e.message));
await pg.goto(s.url + '/?demo=1#JG'); await pg.waitForTimeout(4000);
const r = await pg.evaluate(async () => {
  const M = await import('/jogo/cena.js'); window.jogoTeste.motor.atualizar = () => {}; // o relógio do app não interfere
  const c = window.jogoTeste.motor.jogo.scene.scenes[0]; const m = c.mapa; const porta = m.pontos.porta; const p = c.pepper;
  // O tempo do jogo é do teste: a cena para, e cada "espera" passa quadros de 16 ms (o relógio da cena anda junto).
  c.scene.pause(); let t = c.time.now;
  const espera = async (ms) => { for (let k = 0; k < Math.round(ms / 16); k++) { t += 16; c.time.now = t; c.update(t, 16); } };
  const agora = () => new Date(Date.now()).toISOString(); const o = {}; // uma fonte de hora só (Date.now)
  const rotaDe = (de, para, livres = []) => M.caminho(M.grade(m, livres), de, para).map((q) => [q.x, q.y]);
  const vendo = () => { c.vistaEm = Date.now(); };
  // Cada caso começa do zero: nada do que a demonstração fez antes (o banho, a rua, uma rota pela metade) conta.
  const zerar = () => { Object.assign(p, { visivel: false, estavaFora: undefined, saiuDoPrivado: false, privado: false, fade: null, alvo: null, caminho: [], desvioEm: undefined, esmaecerDe: undefined });
    for (const x of [c.morgan, ...c.visitas]) Object.assign(x, { visivel: false, saindo: false, alvo: null, caminho: [], onde: null }); c.vistaEm = 0; };
  const noSofa = () => { zerar(); c.atualizar({ pepper: { objeto: 'sofa', pose: 'sentada' } }); vendo(); };
  // 1. a rota do servidor: ela segue dali, sem pular, na velocidade de lá
  noSofa(); const ida = [[3.5, 4.5], ...rotaDe({ x: 3.5, y: 4.5 }, { x: 9.5, y: 1.6 }, ['fogao', 'sofa'])];
  c.atualizar({ agora: agora(), pepper: { objeto: 'fogao', pose: 'andando', x: 3.5, y: 4.5, acao: { tipo: 'cozinhar', desde: agora(), fase: 'indo' }, rota: ida } });
  const fim = p.caminho[p.caminho.length - 1] || {};
  o.rota = { x: p.x, y: p.y, fimX: fim.x, fimY: fim.y, vel: p.vel, n: p.caminho.length };
  await espera(1200); o.rotaDepois = { x: p.x, y: p.y, naRota: M.projetar(ida.map(([x, y]) => ({ x, y })), p.x, p.y) };
  // no meio da rota (o servidor já a vê adiante), ela anda até lá e segue; nunca pula
  noSofa(); const meio = ida[Math.floor(ida.length / 2)];
  c.atualizar({ agora: agora(), pepper: { objeto: 'fogao', pose: 'andando', x: meio[0], y: meio[1], acao: { tipo: 'cozinhar', desde: agora(), fase: 'indo' }, rota: ida } });
  o.meio = { x: p.x, y: p.y, n: p.caminho.length };
  // 2. o vigia: esmaece e aparece na porta
  noSofa(); c.atualizar({ agora: agora(), pepper: { objeto: null, pose: 'parada', x: porta.x, y: porta.y, esmaecer: true, acao: { tipo: 'espreguicar', desde: 'v1', fase: 'fazendo' } } });
  o.vigia = { fade: !!p.fade, x: p.x, y: p.y }; await espera(1100); o.vigiaDepois = { x: p.x, y: p.y, fade: !!p.fade, alfa: c.spPepper.alpha };
  // 3. o desvio: ela vai até o abajur, desliga e volta para o sofá, sentada de novo
  noSofa(); const abajur = { x: 1.5, y: 5.2 }; const vai = rotaDe({ x: 3.5, y: 4.5 }, abajur, ['sofa']); const volta = rotaDe(abajur, { x: 3.5, y: 4.5 }, ['sofa']);
  const dv = [[3.5, 4.5], ...vai, ...volta]; const tam = dv.reduce((s2, q, i) => (i ? s2 + Math.hypot(q[0] - dv[i - 1][0], q[1] - dv[i - 1][1]) : 0), 0);
  const sentado = { objeto: 'sofa', pose: 'sentada', x: 3.5, y: 4.5, acao: { tipo: 'ler', desde: 'l1', fase: 'fazendo' } };
  c.atualizar({ agora: agora(), pepper: { ...sentado, desvio: { itens: ['abajur-chao'], rota: dv, em: agora() } } });
  const ult = p.caminho[p.caminho.length - 1] || {}; o.desvio = { n: p.caminho.length, fimX: ult.x, fimY: ult.y };
  noSofa(); c.atualizar({ agora: agora(), pepper: { ...sentado, desvio: { itens: ['abajur-chao'], rota: dv, em: new Date(Date.now() - (tam - 0.4) * 1000).toISOString() } } });
  await espera(1500); o.desvioDepois = { x: p.x, y: p.y, pose: p.pose, n: p.caminho.length };
  // 4. a Morgan: na escola não aparece; chega pela porta; ao abrir o jogo, já está lá; volta à escola pela porta
  const g = c.morgan; const tapete = { onde: 'casa', visivel: true, objeto: 'tapete-sala', pose: 'sentada', balao: 'brinquedo', x: 3.5, y: 6.4 };
  noSofa(); c.atualizar({ pepper: { ...sentado, morgan: { onde: 'escola', visivel: false } } }); vendo(); o.escola = g.visivel;
  c.atualizar({ pepper: { ...sentado, morgan: tapete } }); vendo(); o.chegou = { vis: g.visivel, x: g.x, y: g.y, n: g.caminho.length };
  g.visivel = false; g.onde = null; c.vistaEm = 0; c.atualizar({ pepper: { ...sentado, morgan: tapete } }); vendo(); o.abriu = { vis: g.visivel, x: g.x, y: g.y, n: g.caminho.length };
  c.atualizar({ pepper: { ...sentado, morgan: { onde: 'escola', visivel: false } } }); vendo(); const gf = g.caminho[g.caminho.length - 1] || {}; o.saiu = { vis: g.visivel, saindo: g.saindo, fimX: gf.x, fimY: gf.y };
  await espera(300); o.morganDesenho = c.spMorgan.visible && c.spMorgan.texture.key.startsWith('morgan-');
  // 5. as visitas: chegam pela porta, sentam, vão embora pela porta
  const v = c.visitas[0]; c.atualizar({ pepper: { ...sentado, visitas: [{ nome: 'Amiga', objeto: 'pufe', x: 5.75, y: 7.2, pose: 'sentada' }] } }); vendo();
  o.visita = { vis: v.visivel, x: v.x, y: v.y, n: v.caminho.length }; await espera(200); o.visitaDesenho = c.spVisitas[0].visible;
  c.atualizar({ pepper: { ...sentado, visitas: [] } }); vendo(); const vf = v.caminho[v.caminho.length - 1] || {}; o.visitaSaiu = { saindo: v.saindo, fimX: vf.x, fimY: vf.y };
  // 6. os sentidos e as coisas dela
  noSofa(); c.atualizar({ itens: { tv: { ligada: true, canal: 3, programa: 'Fórmula 1' } }, pepper: { ...sentado, celular: 'mao', prato: { nome: 'Macarrão', porcoes: 2, onde: 'mesa-jantar' }, sentidos: { fumaca: true, vapor: true, cheiros: ['alho'], sons: [] } } });
  await espera(400);
  o.sentidos = { fumaca: c.fumaca.some((x) => x.visible), vapor: c.vapor.some((x) => x.visible), cel: c.spCel.visible, prato: c.spPrato.visible, tv: c.tvTela.visible, tipo: c.tvTipo };
  c.atualizar({ itens: { tv: { ligada: false } }, pepper: { ...sentado, celular: 'perto', sentidos: {} } }); await espera(300);
  o.semSentidos = { fumaca: c.fumaca.some((x) => x.visible), cel: c.spCel.visible, prato: c.spPrato.visible, tv: c.tvTela.visible };
  zerar(); c.atualizar({ pepper: { objeto: 'cama', pose: 'deitada', balao: 'zzz', celular: 'criado' } }); vendo(); await espera(300); o.criado = c.spCelCriado.visible && !c.spCel.visible;
  noSofa(); c.atualizar({ agora: agora(), pepper: { objeto: 'mesa-jantar', pose: 'andando', x: 3.5, y: 4.5, acao: { tipo: 'comer', desde: agora(), fase: 'indo', leva: 'prato' }, rota: [[3.5, 4.5], ...rotaDe({ x: 3.5, y: 4.5 }, { x: 10.6, y: 4.2 }, ['mesa-jantar', 'sofa'])] } });
  await espera(300); o.leva = c.spLeva.visible && c.spLeva.texture.key === 'det-prato_mao';
  // 7. todo balão que o 68 manda tem desenho
  o.baloes = ['brinquedo', 'cafe', 'celular', 'comida', 'lanche', 'livro', 'louca', 'musica', 'notebook', 'panela', 'porta', 'tv', 'zzz', 'conversa'].filter((k) => !c.textures.exists('balao-' + k));
  o.porta = porta; return o;
});
await b.close(); s.fechar();
const perto = (a, x, y, d = 0.05) => Math.abs(a.x - x) < d && Math.abs(a.y - y) < d;
const P = r.porta;
if (!(perto(r.rota, 3.5, 4.5) && r.rota.n > 1)) f.push(`a rota: ela não começou de onde estava (${JSON.stringify(r.rota)})`);
if (!(Math.abs(r.rota.fimX - 9.5) < 0.01 && Math.abs(r.rota.fimY - 1.6) < 0.01)) f.push('a rota: o fim não é o lugar do fogão');
if (r.rota.vel !== 1) f.push('a rota: a velocidade não é a do servidor (1 bloco por segundo)');
const andou = Math.hypot(r.rotaDepois.x - 3.5, r.rotaDepois.y - 4.5); if (!(andou > 0.4 && andou < 1.8)) f.push(`a rota: em 1,2 s ela andou ${andou.toFixed(2)} blocos`);
// Pela rota, 1,2 s a 1 bloco por segundo são 1,2 bloco andados (com o tempo do teste, a conta é exata).
if (!(Math.abs(r.rotaDepois.naRota - 1.2) < 0.05)) f.push(`a rota: em 1,2 s ela andou ${r.rotaDepois.naRota.toFixed(2)} blocos pela rota, não 1,2`);
if (!(perto(r.meio, 3.5, 4.5) && r.meio.n > 1)) f.push('no meio da rota: ela pulou em vez de andar até lá');
if (!(r.vigia.fade && perto(r.vigia, 3.5, 4.5))) f.push('o vigia: ela pulou sem esmaecer');
if (!(perto(r.vigiaDepois, P.x, P.y) && !r.vigiaDepois.fade && r.vigiaDepois.alfa === 1)) f.push(`o vigia: depois do esmaecer ela não estava na porta (${JSON.stringify(r.vigiaDepois)})`);
if (!(r.desvio.n > 1 && Math.abs(r.desvio.fimX - 3.5) < 0.01 && Math.abs(r.desvio.fimY - 4.5) < 0.01)) f.push('o desvio: não foi e voltou para o sofá');
if (!(perto(r.desvioDepois, 3.5, 4.5) && r.desvioDepois.pose === 'sentada' && !r.desvioDepois.n)) f.push(`o desvio: depois de voltar, ela não estava sentada no sofá (${JSON.stringify(r.desvioDepois)})`);
if (r.escola) f.push('a Morgan aparece estando na escola');
if (!(r.chegou.vis && perto(r.chegou, P.x, P.y) && r.chegou.n > 0)) f.push('a Morgan não chegou da escola pela porta');
if (!(r.abriu.vis && perto(r.abriu, 3.5, 6.4) && !r.abriu.n)) f.push('ao abrir o jogo, a Morgan não estava já no lugar');
if (!(r.saiu.vis && r.saiu.saindo && Math.abs(r.saiu.fimX - P.x) < 0.01 && Math.abs(r.saiu.fimY - P.y) < 0.01)) f.push('a Morgan não saiu pela porta para a escola');
if (!r.morganDesenho) f.push('a Morgan não foi desenhada');
if (!(r.visita.vis && perto(r.visita, P.x, P.y) && r.visita.n > 0 && r.visitaDesenho)) f.push('a visita não chegou pela porta');
if (!(r.visitaSaiu.saindo && Math.abs(r.visitaSaiu.fimX - P.x) < 0.01)) f.push('a visita não foi embora pela porta');
for (const [k, nome] of [['fumaca', 'a fumaça'], ['vapor', 'o vapor'], ['cel', 'o celular na mão'], ['prato', 'o prato na mesa'], ['tv', 'a tela da TV']]) { if (!r.sentidos[k]) f.push(nome + ' não apareceu'); if (r.semSentidos[k]) f.push(nome + ' não sumiu'); }
if (r.sentidos.tipo !== 'esporte') f.push('a TV com Fórmula 1 não mostrou a cena de esporte');
if (!r.criado) f.push('dormindo, o celular não ficou no criado-mudo');
if (!r.leva) f.push('indo comer, ela não levava o prato');
if (r.baloes.length) f.push('balões sem desenho: ' + r.baloes.join(', '));
if (erros.length) f.push('erro de JavaScript: ' + erros.join('; '));
console.log(f.length ? 'Rotina: ' + f.join('; ') : 'Rotina: tudo certo');
process.exit(f.length ? 1 : 0);
