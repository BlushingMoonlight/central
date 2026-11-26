// Central — a cena do jogo (etapa 8, entregas 1 a 3): a casa da Pepper (ou a do Jean) em isométrico, a luz, ela vivendo
// sozinha, o gato, o personagem do Jean (só ele é controlado: toque no chão, controle flutuante, teclado e controle), as
// câmeras (seguir a Pepper, seguir o Jean, livre), os andares e o modo construir. O servidor é a verdade (DEC-162): a cena
// só desenha o que o workflow 68 manda e anima no aparelho, sem IA. Phaser 4 (global `Phaser`, carregado pelo app/jogo.js).
import * as A from './arte.js';
import * as Bo from './boneco.js';
import { criarVivo } from './vivo.js';

const BX = 16, BY = 8;
export const iso = (x, y, z = 0) => [(x - y) * BX, (x + y) * BY - z];
// A profundidade (quem fica na frente): a soma x + y do centro da pegada, em blocos. Os soltos (em cima de outro item ou
// na parede) ganham um pouco a mais, para ficar na frente de quem os segura e atrás de quem passa na frente.
export function profundidade(it) {
  if (it.chao) return -50 + (it.x + it.y) * 0.01;
  return it.x + it.w / 2 + it.y + it.d / 2 + (it.solto ? 0.3 : 0);
}
export const profundidadePessoa = (x, y) => x + y + 0.05;

// ---------------------------------------------------------------- o caminho (uma grade de meio bloco)
// O que é baixo no chão se passa por cima, como no servidor (o 68, DEC-188): sem isso, a caminha do gato fechava o vão do
// quarto e ninguém chegava lá andando (B-021).
export const BAIXOS = new Set(['caminha_gato', 'livros', 'cesto', 'potes_gato', 'chinelos']);
// A grade cobre a casa e o lado de fora (a calçada e a rua, a área de "exterior"), para quem sai pela porta (DEC-198): as
// células são contadas a partir do canto da área (x0, y0), que pode ser negativo.
export function grade(mapa, livres = []) {
  const N = 2; const area = mapa.exterior && mapa.exterior.area ? mapa.exterior.area : [0, 0, mapa.largura, mapa.fundo];
  const x0 = Math.min(0, area[0]), y0 = Math.min(0, area[1]), x1 = Math.max(mapa.largura, area[2]), y1 = Math.max(mapa.fundo, area[3]);
  const W = (x1 - x0) * N, H = (y1 - y0) * N;
  const bloqueado = new Uint8Array(W * H);
  for (const it of mapa.itens) {
    if (it.chao || it.solto || it.parede || it.modelo === 'escada' || BAIXOS.has(it.modelo) || livres.includes(it.id)) continue;
    for (let cy = Math.floor((it.y - y0 + 0.05) * N); cy < Math.ceil((it.y - y0 + it.d - 0.05) * N); cy++)
      for (let cx = Math.floor((it.x - x0 + 0.05) * N); cx < Math.ceil((it.x - x0 + it.w - 0.05) * N); cx++) if (cx >= 0 && cy >= 0 && cx < W && cy < H) bloqueado[cy * W + cx] = 1;
  }
  // No prédio dela (adendo 11), fora do apartamento só há chão no corredor: o resto é o vazio do andar alto.
  const ex = mapa.exterior || {}; if (ex.tipo === 'predio') { const c = ex.corredor || [0, 0, 0, 0];
    for (let cy = 0; cy < H; cy++) for (let cx = 0; cx < W; cx++) { const x = (cx + 0.5) / N + x0, y = (cy + 0.5) / N + y0;
      const dentro = mapa.comodos.some((o) => !(o.andar || 0) && x >= o.area[0] && x < o.area[2] && y >= o.area[1] && y < o.area[3]);
      if (!dentro && !(x >= c[0] && x < c[2] && y >= c[1] && y < c[3])) bloqueado[cy * W + cx] = 1; } }
  // As paredes viram arestas que não se cruzam, menos nas aberturas (porta e vão).
  const aberto = (lado, x, y) => mapa.aberturas.some((a) => a.tipo !== 'janela' && ((lado === 'v' && a.lado === 'w' && a.em[0] === x && y >= a.em[1] && y < a.em[1] + a.largura)
    || (lado === 'h' && a.lado === 'n' && a.em[1] === y && x >= a.em[0] && x < a.em[0] + a.largura)));
  const parede = (lado, x, y) => !aberto(lado, Math.floor(x), Math.floor(y)) && mapa.paredes.some((p) => (lado === 'v' ? p.de[0] === p.para[0] && p.de[0] === x && y >= p.de[1] && y < p.para[1]
    : p.de[1] === p.para[1] && p.de[1] === y && x >= p.de[0] && x < p.para[0]));
  const pode = (ax, ay, bx, by) => {
    if (bx < 0 || by < 0 || bx >= W || by >= H || bloqueado[by * W + bx]) return false;
    if (ax !== bx) { const lx = Math.max(ax, bx) / N + x0; if (Number.isInteger(lx) && parede('v', lx, ay / N + y0)) return false; }
    if (ay !== by) { const ly = Math.max(ay, by) / N + y0; if (Number.isInteger(ly) && parede('h', ax / N + x0, ly)) return false; }
    return true;
  };
  return { N, W, H, x0, y0, bloqueado, pode };
}
// A célula de um ponto (em blocos), ou null fora da grade.
export const celula = (g, p) => { const cx = Math.floor((p.x - (g.x0 || 0)) * g.N), cy = Math.floor((p.y - (g.y0 || 0)) * g.N); return cx >= 0 && cy >= 0 && cx < g.W && cy < g.H ? [cx, cy] : null; };
// Busca em largura do ponto (x, y) ao alvo, em blocos; devolve a lista de pontos (centros de célula) ou [] se não chega.
// "estrito" (o boneco do Jean, DEC-198): o alvo fora da grade não tem caminho, e ninguém entra na célula do alvo pela parede.
export function caminho(g, de, para, estrito = false) {
  const ox = g.x0 || 0, oy = g.y0 || 0;
  if (estrito && !celula(g, para)) return [];
  const c = (p) => [Math.min(g.W - 1, Math.max(0, Math.floor((p.x - ox) * g.N))), Math.min(g.H - 1, Math.max(0, Math.floor((p.y - oy) * g.N)))];
  const [sx, sy] = c(de), [tx, ty] = c(para);
  const veio = new Int32Array(g.W * g.H).fill(-1); const fila = [sy * g.W + sx]; veio[fila[0]] = fila[0];
  while (fila.length) {
    const k = fila.shift(); const x = k % g.W, y = (k - x) / g.W;
    if (x === tx && y === ty) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, n = ny * g.W + nx;
      if (nx < 0 || ny < 0 || nx >= g.W || ny >= g.H || veio[n] >= 0) continue;
      if (!g.pode(x, y, nx, ny) && (estrito || !(nx === tx && ny === ty && !g.bloqueado[n]))) continue;
      veio[n] = k; fila.push(n);
    }
  }
  const fim = ty * g.W + tx; if (veio[fim] < 0) return [];
  const pts = []; for (let k = fim; k !== veio[k]; k = veio[k]) pts.unshift({ x: (k % g.W + 0.5) / g.N + ox, y: (Math.floor(k / g.W) + 0.5) / g.N + oy });
  pts.push({ x: para.x, y: para.y }); return pts;
}

// A rota que o servidor manda (o 68, parte B): os pontos [x, y] na grade do mapa. Ela anda 1 bloco por segundo, como lá.
export const VEL_ROTA = 1;
const comprimento = (r) => { let s = 0; for (let i = 1; i < r.length; i++) s += Math.hypot(r[i].x - r[i - 1].x, r[i].y - r[i - 1].y); return s; };
// Quanto da rota já foi andado até o ponto (x, y): a projeção no trecho mais perto.
export function projetar(r, x, y) {
  let melhor = Infinity, andado = 0, ate = 0;
  for (let i = 1; i < r.length; i++) { const a = r[i - 1], b = r[i]; const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy);
    const f = l ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (l * l))) : 0; const d = Math.hypot(a.x + dx * f - x, a.y + dy * f - y);
    if (d < melhor) { melhor = d; andado = ate + l * f; } ate += l; }
  return andado;
}
// O que falta da rota depois de andar "andado" blocos (o primeiro ponto é onde ela está agora); [] se já acabou.
export function restoDaRota(r, andado) {
  let falta = Math.max(0, andado);
  for (let i = 1; i < r.length; i++) { const a = r[i - 1], b = r[i]; const l = Math.hypot(b.x - a.x, b.y - a.y);
    if (falta < l) { const f = l ? falta / l : 1; return [{ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }, ...r.slice(i)]; } falta -= l; }
  return [];
}
const pontosDe = (r) => (Array.isArray(r) && r.length > 1 ? r.map((q) => (Array.isArray(q) ? { x: Number(q[0]), y: Number(q[1]) } : { x: Number(q.x), y: Number(q.y) })).filter((q) => Number.isFinite(q.x) && Number.isFinite(q.y)) : null);
// O programa da TV vira uma cena genérica na tela (nada de marca nem de imagem de verdade).
export const tipoDePrograma = (t) => (/videogame/i.test(t || '') ? 'videogame' : /f1|f[óo]rmula|corrida|futebol|basquete|nba|nfl|copa|jogo d|esporte|t[êe]nis|v[ôo]lei/i.test(t || '') ? 'esporte'
  : /not[íi]cia|jornal/i.test(t || '') ? 'noticia' : /desenho/i.test(t || '') ? 'desenho' : 'serie');

// ---------------------------------------------------------------- a luz
// A escuridão pela hora de Nova York (0 = dia claro; ~0,66 = noite), contínua, sem salto.
export function escuridao(h) {
  const lerp = (a, b, t) => a + (b - a) * Math.min(1, Math.max(0, t));
  if (h >= 7 && h < 17) return 0.08;
  if (h >= 17 && h < 20.5) return lerp(0.08, 0.64, (h - 17) / 3.5);
  if (h >= 5 && h < 7) return lerp(0.64, 0.08, (h - 5) / 2);
  return 0.64;
}
// O sol de cada janela: "n" mais forte à tarde (até o pôr do sol), "w" de manhã.
export function sol(lado, h) {
  const curva = (c, l) => Math.max(0, 1 - Math.abs(h - c) / l);
  return lado === 'n' ? curva(17.2, 4.2) : curva(9, 3.2);
}
// As luzes acesas, no máximo 8 (as mais fortes e mais perto do centro da câmera).
export function luzesAtivas(luzes, cx, cy, max = 8) {
  return luzes.filter((l) => l.ligada && l.brilho > 0)
    .map((l) => ({ ...l, peso: (l.brilho / 100) * l.raio / (1 + Math.hypot(l.wx - cx, l.wy - cy) / 220) }))
    .sort((a, b) => b.peso - a.peso).slice(0, max);
}
// A hora de Nova York; no modo de demonstração, ?hora=21 força a hora (para ver a noite).
const horaNY = (agora) => { const f = typeof location !== 'undefined' && /[?&]demo=1/.test(location.search) ? new URLSearchParams(location.search).get('hora') : null; if (f !== null && f !== '') return Number(f); const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(agora);
  const v = (t) => Number((p.find((x) => x.type === t) || {}).value || 0); return v('hour') + v('minute') / 60; };
// Um andar do mapa (DEC-176): o térreo é o 0; a escada aparece embaixo e em cima.
export function doAndar(m, andar = 0) {
  const de = (x) => (x.andar || 0) === andar;
  return { ...m, comodos: (m.comodos || []).filter(de), paredes: (m.paredes || []).filter(de), aberturas: (m.aberturas || []).filter(de),
    itens: (m.itens || []).filter((i) => de(i) || (i.modelo === 'escada' && (i.andar || 0) + 1 === andar)), exterior: andar ? null : m.exterior, andar };
}
// Os itens com menu: o aviso de ação aparece perto deles (aparelhos.md).
export const temMenu = (it) => !!(it && !it.fora && (it.luz || it.inventario || ['tv', 'toca_discos', 'violao', 'relogio', 'relogio_j', 'caixa_areia', 'potes_gato', 'interruptor'].includes(it.modelo)));
// A direção na tela (o polegar, o teclado) vira a direção no chão isométrico.
export const direcaoNoChao = (sx, sy) => { const x = (sx / BX + sy / BY) / 2, y = (sy / BY - sx / BX) / 2; const n = Math.hypot(x, y) || 1; return [x / n, y / n]; };
const horaCanoinhas = () => { const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date()); return Number(p[0].value) + Number(p[2].value) / 60; };
const corNum = (c) => parseInt(String(c || '#ffffff').replace('#', ''), 16);

// ---------------------------------------------------------------- a cena

// A pose "usando" (as mãos na frente): o que ela faz de pé com as mãos (J1).
const USANDO = new Set(['cozinhar', 'louca', 'cafe', 'lanche', 'pia', 'lixo', 'areia', 'regar', 'arrumar', 'trabalho_pe', 'desembalar']);
// ---------------------------------------------------------------- a cena
// op: mapa, aoDiagnostico, aoTocar(id, sx, sy), aoSoltar(id, x, y, espelhar, tirar), aoAndou(x, y, andar), aoPerto(id|null, sx, sy),
// aoBotao('A'|'B'|'select'|'start'), aoJoy(ligado, sx, sy, dx, dy), aoConstrutor(tipo, x, y), aoAndar(andar).
export function criarJogo(Phaser, pai, op) {
  const { aoDiagnostico, aoTocar, aoSoltar } = op; let cena = null; let pendente = null;
  class Casa extends Phaser.Scene {
    constructor() { super('casa'); }
    create() {
      cena = this; this.vivo = criarVivo(this, () => (this.dela ? horaNY(new Date()) : horaCanoinhas())); this.mapaTodo = op.mapa; this.andar = 0; this.mapa = doAndar(this.mapaTodo, 0); this.estados = {}; this.diag = { luzes: 0, total: 0 };
      this.obras = []; this.camera = 'pepper'; this.livre = null; this.dirExterna = [0, 0]; this.teclas = new Set(); this.gp = {};
      this.cameras.main.setBackgroundColor('#1b1430');
      this.registrarArte(); this.montar(); this.montarLuz(); this.montarPessoas(); this.montarCamera(); this.montarTeclado();
      this.marcas = this.add.graphics().setDepth(1100);
      this.time.addEvent({ delay: 30000, loop: true, callback: () => this.redesenharLuz() });
      if (pendente) { this.atualizar(pendente); pendente = null; }
    }
    get dela() { return !this.mapaTodo.id || this.mapaTodo.id === 'casa-pepper'; }
    textura(chave, pincel) { if (!this.textures.exists(chave)) this.textures.addCanvas(chave, pincel.pronto ? pincel.pronto() : pincel); }
    registrarArte() {
      this.ancoras = this.ancoras || {};
      for (const t of [...A.PISOS, 'calcada', 'asfalto', 'asfalto_faixa', 'tijolo', 'grama']) this.textura('piso-' + t, A.piso(t));
      for (const lado of ['n', 'w']) for (const alt of [['alta', 48], ['baixa', 10]]) for (const tipo of ['parede', 'janela', 'porta']) for (const cor of Object.keys(A.CORES_PAREDE))
        if (!(alt[0] === 'baixa' && tipo === 'janela')) { const k = `parede-${lado}-${alt[0]}-${tipo}-${cor}`; if (this.textures.exists(k)) continue; const p = A.parede(lado, alt[1], tipo, cor); this.textura(k, p); this.ancoras[k] = p.ancora; }
      for (const [k, p] of Object.entries(A.detalhes())) this.textura('det-' + k, p);
      for (const [k, p] of Object.entries(A.personagens())) this.textura(k, p);
      // as pessoas: o boneco em camadas (parte J1); a Pepper com a roupa do dia, as visitas genéricas
      this.definirPepper({}); Bo.VISITAS.forEach((ap, k) => { for (const [c, p] of Object.entries(Bo.quadros('visita' + k, ap))) this.textura(c, p); });
      this.textura('halo', A.halo(64)); this.textura('feixe', A.feixe(96, 64));
    }
    texturaItem(it) { const k = 'item-' + it.id; const assin = `${it.modelo}:${it.w}:${it.d}`;
      if (this.textures.exists(k) && this.ancoras[k] && this.assinaturas && this.assinaturas[k] === assin) return;
      if (this.textures.exists(k)) this.textures.remove(k); const p = A.item(it); if (!p) return; this.textura(k, p); this.ancoras[k] = p.ancora; (this.assinaturas = this.assinaturas || {})[k] = assin; }
    // O personagem do Jean, com a aparência dele (DEC-176): redesenhado só quando ela muda.
    definirJean(ap, veste) { const k = JSON.stringify([ap || {}, veste || null]); if (k === this.aparencia) return; this.aparencia = k;
      const o = veste ? Bo.vestir(ap || {}, veste) : {};
      for (const [chave, p] of Object.entries(Bo.quadros('jean', ap || {}, o))) { if (this.textures.exists(chave)) this.textures.remove(chave); this.textura(chave, p); }
      if (this.spJean) this.spJean.setTexture('jean-frente-parada'); }
    // A Pepper com a roupa do dia (J1: a ocasião e as peças vêm do servidor; o rosto é fixo): redesenhada só quando muda.
    definirPepper(veste) { const k = JSON.stringify(veste || {}); if (k === this.vestePepper) return; this.vestePepper = k;
      for (const [chave, p] of Object.entries(Bo.pepper(veste || {}))) { if (this.textures.exists(chave)) this.textures.remove(chave); this.textura(chave, p); }
      if (this.spPepper) this.spPepper.setTexture('pepper-frente-parada'); if (this.spCabeca) this.spCabeca.setTexture('pepper-deitada'); }
    // Os itens do andar (de novo a cada versão nova do mapa: o modo mover e o construtor). O espelhado vira o desenho.
    montarItens() {
      for (const s of Object.values(this.sprites || {})) s.destroy();
      this.sprites = {};
      for (const it of this.mapa.itens) {
        this.texturaItem(it); const k = 'item-' + it.id; if (!this.textures.exists(k)) continue;
        const [wx, wy] = iso(it.x, it.y, it.z || 0); const [ax, ay] = this.ancoras[k];
        this.sprites[it.id] = this.add.image(wx, wy, k).setOrigin(it.espelhado ? 1 - ax : ax, ay).setFlipX(!!it.espelhado).setDepth(profundidade(it));
        if (it.cor) this.sprites[it.id].setTint(corNum(A.mistura(it.cor, '#ffffff', 0.35))); // a ferramenta de design (J2): a cor nova, o mesmo item
      }
      const pe = (id, dx, dy, z, chave, extra = 0) => { const it = this.mapa.itens.find((i) => i.id === id); if (!it) return null; const [wx, wy] = iso(it.x + dx, it.y + dy, z);
        return this.add.image(wx, wy, 'det-' + chave).setOrigin(0.5, 1).setDepth(profundidade(it) + 0.05 + extra).setVisible(false); };
      for (const s of Object.values(this.detalhe || {})) (Array.isArray(s) ? s : [s]).forEach((x) => x && x.destroy());
      this.detalhe = { louca: pe('pia', 0.6, 0.5, 16, 'louca'), lixo: pe('lixeira', 0.25, 0.45, 2, 'lixo', 0.1), roupa: pe('cesto-roupa', 0.3, 0.3, 9, 'roupa'), lencol: pe('cama', 1.0, 1.1, 16, 'lencol'),
        areia: pe('caixa-areia', 0.5, 0.5, 5, 'areia_suja'), mancha: pe('caixa-areia', 1.3, 0.5, 0, 'mancha', -0.3), racao: pe('potes-gato', 0.18, 0.2, 3, 'racao'),
        moscas: [0, 1, 2].map(() => pe('caixa-areia', 0.5, 0.5, 14, 'mosca', 0.2)) };
      const tv = this.mapa.itens.find((i) => i.modelo === 'tv'); this.tvLuz && this.tvLuz.destroy();
      this.tvLuz = tv ? this.add.image(...iso(tv.x + tv.w / 2, tv.y + 0.8, 12), 'halo').setBlendMode(Phaser.BlendModes.ADD).setDepth(1001).setScale(1.2, 0.8).setVisible(false) : null;
      this.g = grade(this.mapa); this.vivo.montarItens();
    }
    montar() {
      const m = this.mapa; const obra = (o) => { this.obras.push(o); return o; };
      // fora da casa nunca fica vazio (aparelhos.md): a calçada em volta, a rua na frente e do lado, o fundo atrás
      const chao = [];
      // o prédio dela (adendo 11): só o corredor, com as portas dos vizinhos e o elevador; o resto é o vazio do andar alto.
      // A casa dele: a garagem de cimento (o resto como antes: a calçada, a rua e o quintal).
      const ex = m.exterior; const predio = ex && ex.tipo === 'predio'; const corr = predio && ex.corredor; const gar = ex && ex.garagem;
      if (ex) for (let y = ex.area[1]; y < ex.area[3]; y++) for (let x = ex.area[0]; x < ex.area[2]; x++) {
        if (x >= 0 && y >= 0 && x < m.largura && y < m.fundo && m.comodos.some((c) => c.area[0] <= x && x < c.area[2] && c.area[1] <= y && y < c.area[3])) continue;
        if (predio) { if (corr && x >= corr[0] && x < corr[2] && y >= corr[1] && y < corr[3]) chao.push([x, y, 'carpete']); continue; }
        if (gar && x >= gar[0] && x < gar[2] && y >= gar[1] && y < gar[3]) { chao.push([x, y, 'cimento']); continue; }
        const dx = x < 0 ? -x : x >= m.largura ? x - m.largura + 1 : 0, dy = y < 0 ? -y : y >= m.fundo ? y - m.fundo + 1 : 0;
        const frente = y >= m.fundo || x >= m.largura; const d = Math.max(dx, dy);
        const t = d === 0 ? ex.fundo : !frente ? (d <= ex.calcada ? 'calcada' : ex.fundo) : d <= ex.calcada ? 'calcada' : d <= ex.calcada + ex.rua ? ((d === ex.calcada + Math.ceil(ex.rua / 2)) && (x + y) % 3 ? 'asfalto_faixa' : 'asfalto') : 'calcada';
        chao.push([x, y, t]);
      }
      // o chão de dentro
      for (const c of m.comodos) for (let y = c.area[1]; y < c.area[3]; y++) for (let x = c.area[0]; x < c.area[2]; x++) {
        if (m.comodos.some((o) => o !== c && o.area[0] <= x && x < o.area[2] && o.area[1] <= y && y < o.area[3] && (o.area[2] - o.area[0]) * (o.area[3] - o.area[1]) < (c.area[2] - c.area[0]) * (c.area[3] - c.area[1]))) continue;
        chao.push([x, y, c.piso]);
      }
      // Todo o chão numa textura só, desenhada uma vez (o desempenho no celular, DEC-173): o de fora primeiro, o de dentro por cima.
      const ae = m.exterior ? m.exterior.area : [0, 0, m.largura, m.fundo];
      const cx = [], cy = []; for (const [x, y] of [[ae[0], ae[1]], [ae[2], ae[1]], [ae[0], ae[3]], [ae[2], ae[3]]]) { const [a, b] = iso(x, y); cx.push(a); cy.push(b); }
      const x0 = Math.min(...cx) - 20, y0 = Math.min(...cy) - 4, rt = obra(this.add.renderTexture(x0, y0, Math.max(...cx) - x0 + 20, Math.max(...cy) - y0 + 20).setOrigin(0, 0).setDepth(-100));
      for (const [x, y, t] of chao) { const [wx, wy] = iso(x, y); rt.stamp('piso-' + (this.textures.exists('piso-' + t) ? t : 'madeira'), null, wx - x0 - 17, wy - y0 - 1, { originX: 0, originY: 0 }); }
      // a sombra suave nos cantos (adendo 11): uma faixa escura no chão, junto de cada parede alta
      const sombra = this.add.graphics(); sombra.fillStyle(0x1a1424, 0.16);
      for (const pa of m.paredes) { if (pa.altura !== 'alta') continue; const n = pa.de[1] === pa.para[1]; const [a0, b0] = pa.de, [a1, b1] = pa.para; const fx = n ? 0 : 0.35, fy = n ? 0.35 : 0;
        const pts = [iso(a0, b0), iso(a1, b1), iso(a1 + fx, b1 + fy), iso(a0 + fx, b0 + fy)].map(([px, py]) => ({ x: px - x0, y: py - y0 }));
        sombra.fillPoints(pts, true); }
      rt.draw(sombra, 0, 0); sombra.destroy();
      rt.render();
      // as paredes, bloco a bloco, com as janelas e as portas
      this.portaBanheiro = null; const janelasVista = [];
      for (const pa of m.paredes) {
        const lado = pa.de[1] === pa.para[1] ? 'n' : 'w'; const n = lado === 'n' ? pa.para[0] - pa.de[0] : pa.para[1] - pa.de[1];
        for (let k = 0; k < n; k++) {
          const x = lado === 'n' ? pa.de[0] + k : pa.de[0], y = lado === 'n' ? pa.de[1] : pa.de[1] + k;
          const ab = m.aberturas.find((a) => a.lado === lado && (lado === 'n' ? a.em[1] === y && x >= a.em[0] && x < a.em[0] + a.largura : a.em[0] === x && y >= a.em[1] && y < a.em[1] + a.largura));
          if (ab && ab.tipo === 'vao') continue;
          if (ab && ab.tipo === 'porta' && pa.altura === 'baixa' && !ab.privada) continue;
          const tipo = ab ? ab.tipo : 'parede'; const cor = A.CORES_PAREDE[pa.cor] ? pa.cor : 'rosado'; const chave = `parede-${lado}-${pa.altura}-${pa.altura === 'baixa' && tipo === 'janela' ? 'parede' : tipo}-${cor}`;
          const px = lado === 'n' ? x : x - 0.25, py = lado === 'n' ? y - 0.25 : y;
          const [wx, wy] = iso(px, py);
          const fundo = pa.altura === 'alta';
          const s = obra(this.add.image(wx, wy, chave).setOrigin(...this.ancoras[chave]));
          s.setDepth(fundo ? -60 + (x + y) * 0.01 : (lado === 'n' ? x + 0.5 + y : x + y + 0.5) - 0.02);
          if (ab && ab.tipo === 'porta' && ab.privada) this.portaBanheiro = { wx, wy: wy - 30, x, y };
          if (tipo === 'janela' && fundo) janelasVista.push({ lado, s, x, y });
        }
      }
      // as paredes do corredor do prédio (o fundo, fora do apartamento) e a do fim do corredor
      if (predio && corr) { const pecaN = 'parede-n-alta-parede-creme', pecaW = 'parede-w-alta-parede-creme';
        for (let x = corr[0]; x < corr[2]; x++) if (x < 0 || x >= m.largura) { const [wx, wy] = iso(x, corr[1] - 0.25); obra(this.add.image(wx, wy, pecaN).setOrigin(...this.ancoras[pecaN]).setDepth(-60 + (x + corr[1]) * 0.01)); }
        for (let y = corr[1]; y < corr[3]; y++) { const [wx, wy] = iso(corr[0] - 0.25, y); obra(this.add.image(wx, wy, pecaW).setOrigin(...this.ancoras[pecaW]).setDepth(-60 + (corr[0] + y) * 0.01)); } }
      this.vivo.montarJanelas(janelasVista);
      this.montarItens();
      const xs = [], ys = [];
      for (const [x, y] of [[ae[0], ae[1]], [ae[2], ae[1]], [ae[0], ae[3]], [ae[2], ae[3]]]) { const [a, b] = iso(x, y); xs.push(a); ys.push(b); }
      this.limites = { x0: Math.min(...xs) - 40, x1: Math.max(...xs) + 40, y0: Math.min(...ys) - 80, y1: Math.max(...ys) + 40 };
      // a chuva e a neve, só do lado de fora (o clima real de NY, DEC-175)
      this.gotas = [];
      if (m.exterior && !predio) for (let k = 0; k < 70; k++) this.gotas.push({ s: obra(this.add.image(0, 0, 'det-gota').setDepth(999).setVisible(false)), t: Math.random() });
      this.notas = [0, 1, 2].map(() => obra(this.add.image(0, 0, 'det-nota').setDepth(1003).setVisible(false)));
    }
    // Um ponto do chão fora da casa, ao acaso, para a gota cair.
    pontoFora() { const m = this.mapa, a = m.exterior.area; for (let k = 0; k < 50; k++) { const x = a[0] + Math.random() * (a[2] - a[0]), y = a[1] + Math.random() * (a[3] - a[1]); if (x < -0.3 || y < -0.3 || x > m.largura + 0.3 || y > m.fundo + 0.3) return [x, y]; } return [a[0], a[1]]; }
    montarLuz() {
      const L = this.limites; this.escuro = this.add.renderTexture(L.x0, L.y0, L.x1 - L.x0, L.y1 - L.y0).setOrigin(0, 0).setDepth(1000); this.obras.push(this.escuro);
      this.borracha = this.borracha || this.make.image({ key: 'halo', add: false });
      this.luzes = []; this.montarLuzes();
      this.janelas = this.mapa.aberturas.filter((a) => a.tipo === 'janela').map((a) => {
        const [wx, wy] = a.lado === 'n' ? iso(a.em[0] + a.largura / 2, a.em[1] + 1.4) : iso(a.em[0] + 1.4, a.em[1] + a.largura / 2);
        const s = this.add.image(wx, wy - 20, 'feixe').setBlendMode(Phaser.BlendModes.ADD).setDepth(1002).setTint(0xffc983).setAlpha(0); this.obras.push(s);
        s.setAngle(a.lado === 'n' ? -28 : 28).setScale(1.1, 1.2); return { a, s, wx, wy };
      });
    }
    montarLuzes() {
      const antes = Object.fromEntries((this.luzes || []).map((l) => { l.brilhoSprite.destroy(); return [l.id, l]; }));
      this.luzes = this.mapa.itens.filter((it) => it.luz).map((it) => { const [wx, wy] = iso(it.x + it.w / 2, it.y + it.d / 2, (it.z || 0) + (it.luz.altura || 18));
        const v = antes[it.id] || {};
        return { id: it.id, wx, wy, raio: it.luz.raio, cor: v.cor || it.luz.cor, ligada: !!v.ligada, brilho: v.brilho ?? 100, brilhoSprite: this.add.image(wx, wy, 'halo').setBlendMode(Phaser.BlendModes.ADD).setDepth(1001).setVisible(false) }; });
    }
    // Outro mapa, outro andar ou o mapa novo do construtor (DEC-176): desmonta o que foi desenhado e monta de novo.
    remontar(mapa, andar = 0) {
      for (const o of this.obras) o.destroy(); this.obras = [];
      for (const l of this.luzes || []) l.brilhoSprite.destroy(); this.luzes = [];
      this.mapaTodo = mapa; this.andar = andar; this.mapa = doAndar(mapa, andar); this.cancelarMover();
      this.montar(); this.montarLuz(); this.redesenharLuz();
      const gp = (this.mapa.pontos || {}).gato; this.gGato = grade(this.mapa, ['caminha-gato', 'sofa', 'cama', 'tapete-sala']); if (this.gato) { this.gato.caminho = []; this.gato.proxima = 0; if (!gp) this.gato.vivo = false; }
      if (this.pepper) { this.pepper.alvo = null; this.pepper.caminho = []; this.pepper.fade = null; }
      for (const o of [this.morgan, ...(this.visitas || [])]) if (o) { o.alvo = null; o.caminho = []; o.saindo = false; }
      if (this.estado) this.aplicarItens(this.estado);
    }
    redesenharLuz() {
      const h = horaNY(new Date()); const e = this.dela ? escuridao(h) : escuridao(horaCanoinhas()); const cam = this.cameras.main;
      const ativas = luzesAtivas(this.luzes, cam.midPoint.x, cam.midPoint.y);
      this.diag.luzes = ativas.length; this.diag.total = this.luzes.filter((l) => l.ligada).length;
      // a paleta quente à noite (adendo 11): no fim da tarde e no começo da noite, o escuro puxa para o vinho; de madrugada, o azul
      const hh = this.dela ? h : horaCanoinhas(); const quente = hh >= 17 && hh < 23 ? 1 - Math.abs(hh - 20) / 3 : 0;
      const L = this.limites; this.escuro.clear(); this.escuro.fill(quente > 0 ? corNum(A.mistura('#1b1430', '#3a1e2c', Math.min(1, quente))) : 0x1b1430, e);
      for (const l of ativas) { this.borracha.setScale(l.raio * 2 / 64).setAlpha(Math.min(1, 0.55 + l.brilho / 200)); this.escuro.erase(this.borracha, l.wx - L.x0, l.wy - L.y0); }
      const nub = this.clima === 'chuva' || this.clima === 'neve' ? 0.25 : this.clima === 'nublado' ? 0.5 : 1;
      for (const j of this.janelas) j.s.setAlpha(sol(j.a.lado, this.dela ? h : horaCanoinhas()) * (1 - e) * 0.55 * (this.dela ? nub : 1));
      this.escuro.render();
      for (const l of this.luzes) { const on = ativas.some((a) => a.id === l.id); l.brilhoSprite.setVisible(on && e > 0.15).setTint(corNum(l.cor)).setScale(l.raio * 0.9 / 64).setAlpha(0.12 + 0.16 * l.brilho / 100); }
      this.horaAtual = h;
    }
    montarPessoas() {
      const p0 = this.mapa.pontos.porta;
      this.pepper = { x: p0.x, y: p0.y, caminho: [], lado: 'frente', esp: false, pose: 'parada', quadro: 0, t: 0, visivel: false, alvo: null };
      this.spPepper = this.add.image(0, 0, 'pepper-frente-parada').setOrigin(...Bo.ORIGEM).setVisible(false);
      this.spCabeca = this.add.image(0, 0, 'pepper-deitada').setOrigin(0.5, 1).setVisible(false);
      this.spBalao = this.add.image(0, 0, 'balao-livro').setOrigin(0.5, 1).setDepth(1003).setVisible(false);
      this.spPorta = this.add.image(0, 0, 'balao-porta').setOrigin(0.5, 1).setDepth(1003).setVisible(false);
      const gp = ((this.mapa.pontos.gato || {}).dormir || [p0])[0];
      this.gato = { x: gp.x, y: gp.y, z: 0, caminho: [], esp: false, dormindo: true, quadro: 0, t: 0, acao: 'dormindo', proxima: 0, vivo: !!this.mapa.pontos.gato };
      this.spGato = this.add.image(0, 0, 'gato-dormindo').setOrigin(0.5, 0.9).setVisible(this.gato.vivo);
      this.spBalaoGato = this.add.image(0, 0, 'balao-coracao').setOrigin(0.5, 1).setDepth(1003).setVisible(false);
      this.gGato = grade(this.mapa, ['caminha-gato', 'sofa', 'cama', 'tapete-sala']);
      // o Jean: aparece quando o servidor diz que ele está neste mapa
      this.definirJean({});
      this.jean = { x: p0.x, y: p0.y, andar: 0, caminho: [], lado: 'frente', esp: false, quadro: 0, t: 0, visivel: false, mexeuEm: 0 };
      this.spJean = this.add.image(0, 0, 'jean-frente-parada').setOrigin(...Bo.ORIGEM).setVisible(false);
      this.spJeanCabeca = this.add.image(0, 0, 'jean-deitada').setOrigin(0.5, 1).setVisible(false);
      // Parte B: a Morgan, as duas visitas, o que ela leva na mão, o celular, o prato, a fumaça, o vapor e a tela da TV.
      const figura = () => ({ x: p0.x, y: p0.y, caminho: [], lado: 'frente', esp: false, quadro: 0, t: 0, visivel: false, alvo: null, pose: 'parada', saindo: false });
      this.morgan = { ...figura(), onde: null, banho: false };
      this.spMorgan = this.add.image(0, 0, 'morgan-frente-parada').setOrigin(7 / 14, 24 / 26).setVisible(false);
      this.spBalaoMorgan = this.add.image(0, 0, 'balao-tv').setOrigin(0.5, 1).setDepth(1003).setVisible(false);
      this.visitas = [figura(), figura()];
      this.spVisitas = this.visitas.map((v, k) => this.add.image(0, 0, `visita${k}-frente-parada`).setOrigin(...Bo.ORIGEM).setVisible(false));
      this.spBalaoVisita = this.add.image(0, 0, 'balao-conversa').setOrigin(0.5, 1).setDepth(1003).setVisible(false);
      const det = (k, ox = 0.5, oy = 1) => this.add.image(0, 0, 'det-' + k).setOrigin(ox, oy).setVisible(false);
      this.spCel = det('celular'); this.spCelCriado = det('celular_deitado', 0.5, 0.5); this.spLeva = det('prato_mao'); this.spPrato = det('prato', 0.5, 0.5);
      this.fumaca = [0, 1, 2, 3].map(() => det('fumaca', 0.5, 0.5).setDepth(1003)); this.vapor = [0, 1, 2, 3].map(() => det('vapor', 0.5, 0.5).setDepth(1003));
      this.tvTela = this.add.graphics().setVisible(false);
      this.b = { sentidos: {}, celular: null, prato: null, leva: null };
    }
    // Ela some e aparece no lugar (o vigia, ou um lugar sem caminho): nunca um pulo na frente do Jean (DEC-190).
    esmaecer(d) { const p = this.pepper; p.caminho = []; p.fade = { t0: this.time.now, x: d.x, y: d.y, trocou: false }; }
    // Os itens embaixo de um ponto (o lugar de sentar no tapete, embaixo da mesinha): não bloqueiam quem vai até ali.
    itensEm(d) { return this.mapa.itens.filter((i) => !i.chao && d.x >= i.x && d.x <= i.x + i.w && d.y >= i.y && d.y <= i.y + i.d).map((i) => i.id); }
    // Junta a posição de agora ao começo de uma rota: se ela está longe do primeiro ponto, anda até ele pela grade.
    ligar(o, pts, livres = []) { if (!pts.length) return pts; const a = pts[0]; if (Math.hypot(a.x - o.x, a.y - o.y) <= 0.6) return pts;
      const ida = caminho(grade(this.mapa, [...livres, ...this.itensEm(a), ...this.itensEm(o)]), o, a); return ida.length ? [...ida, ...pts.slice(1)] : pts; }
    // A Morgan (DEC-188, item 5): onde a rotina dela diz. Chega da escola (ou da rua com a Pepper) pela porta e sai por ela;
    // na casa, anda até o lugar novo (nunca pula). Ao abrir o jogo, ela já está lá.
    atualizarMorgan(mg, direto) {
      const g = this.morgan; const m = this.mapa; const porta = m.pontos.porta; const antes = g.onde; g.onde = mg ? mg.onde : null;
      g.banho = !!(mg && mg.onde === 'casa' && !mg.visivel && /banho/i.test(mg.atividade || ''));
      const vis = !!(mg && mg.onde === 'casa' && mg.visivel && mg.x != null && mg.y != null && Number.isFinite(Number(mg.x)) && Number.isFinite(Number(mg.y)));
      if (!vis) {
        const saiu = mg && (mg.onde === 'escola' || mg.onde === 'com_ela');
        if (g.visivel && saiu && !direto) { if (!g.saindo) { g.saindo = true; g.alvo = null; g.caminho = caminho(grade(m, this.itensEm(g)), g, porta); if (!g.caminho.length) g.visivel = false; } }
        else { g.visivel = false; g.saindo = false; }
        return;
      }
      g.saindo = false; g.pose = mg.pose || 'parada'; g.balao = mg.balao || null; g.objeto = mg.objeto || null; const d = { x: Number(mg.x), y: Number(mg.y) };
      // À mesa, do outro lado: o ponto do servidor cai dentro do tampo; ela senta na beira de trás, com a cabeça à vista.
      const mesa = m.itens.find((i) => i.id === g.objeto && i.modelo === 'mesa_jantar'); if (mesa && d.y > mesa.y - 0.4 && d.y < mesa.y + mesa.d && d.x >= mesa.x && d.x <= mesa.x + mesa.w) d.y = mesa.y - 0.4;
      if (!g.visivel || direto) { const veio = !direto && (antes === 'escola' || antes === 'com_ela');
        if (!veio) { g.visivel = true; g.x = d.x; g.y = d.y; g.caminho = []; g.alvo = d; g.lado = 'frente'; g.esp = false; return; }
        g.visivel = true; g.x = porta.x; g.y = porta.y; g.alvo = null; }
      if (g.alvo && g.alvo.x === d.x && g.alvo.y === d.y) return; g.alvo = d;
      g.caminho = caminho(grade(m, [g.objeto, ...this.itensEm(d), ...this.itensEm(g)].filter(Boolean)), g, d); if (!g.caminho.length) { g.x = d.x; g.y = d.y; }
    }
    // As visitas do cânone (DEC-188, item 5): chegam pela porta, sentam na sala e vão embora pela porta.
    atualizarVisitas(lista, direto) {
      const m = this.mapa; const porta = m.pontos.porta;
      this.visitas.forEach((st, k) => {
        const v = (lista || [])[k]; const ok = v && v.x != null && v.y != null && Number.isFinite(Number(v.x)) && Number.isFinite(Number(v.y));
        if (!ok) { if (st.visivel && !direto) { if (!st.saindo) { st.saindo = true; st.alvo = null; st.caminho = caminho(grade(m, this.itensEm(st)), st, porta); if (!st.caminho.length) st.visivel = false; } } else { st.visivel = false; st.saindo = false; } return; }
        st.saindo = false; st.nome = v.nome || ''; st.pose = v.pose || 'sentada'; const d = { x: Number(v.x), y: Number(v.y) };
        if (!st.visivel) { st.visivel = true; if (direto) { st.x = d.x; st.y = d.y; st.caminho = []; st.alvo = d; return; } st.x = porta.x; st.y = porta.y; st.alvo = null; }
        if (st.alvo && st.alvo.x === d.x && st.alvo.y === d.y) return; st.alvo = d;
        st.caminho = caminho(grade(m, [v.objeto, ...this.itensEm(d), ...this.itensEm(st)].filter(Boolean)), st, d); if (!st.caminho.length) { st.x = d.x; st.y = d.y; }
      });
    }
    montarCamera() {
      const cam = this.cameras.main; this.desvio = { x: 0, y: 0 }; this.arrastando = null;
      // A câmera sem depender da pinça (rodada 9, adendo 3): botões + e −, toque duplo, roda do mouse, botão do meio,
      // um dedo arrastando (no construtor, menos com uma ferramenta de desenhar), "centralizar" e "ver tudo". A pinça segue.
      this.input.on('wheel', (p, o, dx, dy) => { if (this.time.now - (this.rodaEm || 0) < 160) return; this.rodaEm = this.time.now; this.mudarZoom(dy < 0 ? 1 : -1); });
      this.input.on('pointerdown', (p) => {
        const dois = this.input.pointer1.isDown && this.input.pointer2.isDown;
        if (dois) { clearTimeout(this.segura); if (this.joy) { this.joy = null; op.aoJoy && op.aoJoy(false); } this.arrastando = null; this.pinca = this.distPinca(); return; }
        if (p.middleButtonDown && p.middleButtonDown()) { this.arrastando = { x: p.x, y: p.y, dx: this.desvio.x, dy: this.desvio.y, t: this.time.now, meio: true, ...this.pontoLivre() }; return; }
        this.fixo = null; this.arrastando = { x: p.x, y: p.y, dx: this.desvio.x, dy: this.desvio.y, t: this.time.now, ...this.pontoLivre() };
        // no construtor, o dedo em cima de um item (ou na borda de um cômodo) é dele: arrasta o item, não a câmera (adendo 3)
        if (this.construindo) { const [x, y] = this.chaoNaTela(p); this.capturado = !!(op.aoConstrutor && op.aoConstrutor('inicio', x, y) === 'captura'); return; }
        // segurar o dedo num item: a informação (o toque longo, J3); no vazio, seguindo o Jean: o controle flutuante
        // embaixo do polegar (aparelhos.md)
        clearTimeout(this.longo); const alvo = this.movendo ? null : this.alvoEm(p);
        if (alvo && op.aoInfo) this.longo = setTimeout(() => { const a = this.arrastando; if (!a || this.joy || Math.hypot(p.x - a.x, p.y - a.y) > 10) return; a.longo = true;
          const pt = this.naTela(alvo.s.x, alvo.s.y - alvo.s.displayHeight * 0.6); op.aoInfo(alvo.id, pt.x, pt.y); }, 480);
        clearTimeout(this.segura); if (this.podeAndar() && !alvo) this.segura = setTimeout(() => { const a = this.arrastando; if (!a || this.joy) return; this.joy = { sx: a.x, sy: a.y, dx: 0, dy: 0 }; this.arrastando = null; op.aoJoy && op.aoJoy(true, a.x, a.y, 0, 0); }, 280);
      });
      this.input.on('pointermove', (p) => {
        this.ponteiro = p;
        if (this.pinca) { if (!(this.input.pointer1.isDown && this.input.pointer2.isDown)) { this.pinca = null; return; }
          const d = this.distPinca(); if (d > this.pinca * 1.3) { this.mudarZoom(1); this.pinca = d; } else if (d < this.pinca / 1.3) { this.mudarZoom(-1); this.pinca = d; } return; }
        if (this.movendo) this.moverFantasma(p);
        const meio = this.arrastando && this.arrastando.meio;
        if (this.construindo && p.isDown && !meio) { const [x, y] = this.chaoNaTela(p); op.aoConstrutor && op.aoConstrutor('arrasto', x, y); if (this.construindo === 'desenhar' || this.capturado) return; }
        if (this.joy) { const dx = p.x - this.joy.sx, dy = p.y - this.joy.sy, d = Math.hypot(dx, dy), r = 44; this.joy.dx = d > r ? dx / d * r : dx; this.joy.dy = d > r ? dy / d * r : dy; op.aoJoy && op.aoJoy(true, this.joy.sx, this.joy.sy, this.joy.dx, this.joy.dy); return; }
        const a = this.arrastando; if (!a || !p.isDown || this.movendo) return; if (Math.hypot(p.x - a.x, p.y - a.y) > 10) { clearTimeout(this.segura); clearTimeout(this.longo); } const z = cam.zoom;
        if (this.cameraSolta() && this.livre) { this.livre.x = a.lx - (p.x - a.x) / z; this.livre.y = a.ly - (p.y - a.y) / z; const L = this.limites; this.livre.x = Math.max(L.x0, Math.min(L.x1, this.livre.x)); this.livre.y = Math.max(L.y0, Math.min(L.y1, this.livre.y)); return; }
        this.desvio.x = Math.max(-420, Math.min(420, a.dx - (p.x - a.x) / z)); this.desvio.y = Math.max(-260, Math.min(260, a.dy - (p.y - a.y) / z)); });
      this.input.on('pointerup', (p) => {
        clearTimeout(this.segura); clearTimeout(this.longo);
        if (this.arrastando && this.arrastando.longo) { this.arrastando = null; this.soltouEm = this.time.now; return; }
        if (this.pinca) { if (!(this.input.pointer1.isDown && this.input.pointer2.isDown)) this.pinca = null; this.arrastando = null; return; }
        if (this.arrastando && this.arrastando.meio) { this.arrastando = null; this.soltouEm = this.time.now; return; }
        if (this.joy) { this.joy = null; op.aoJoy && op.aoJoy(false); this.jeanParou(); this.arrastando = null; return; }
        const a = this.arrastando; const toque = a && Math.hypot(p.x - a.x, p.y - a.y) < 10 && this.time.now - a.t < 600;
        if (this.construindo) { const [x, y] = this.chaoNaTela(p); op.aoConstrutor && op.aoConstrutor(toque || this.construindo === 'desenhar' || this.capturado ? 'fim' : 'arrastou', x, y); this.capturado = false; this.arrastando = null; this.soltouEm = this.time.now; return; }
        // O toque duplo (no mesmo lugar, em até 300 ms): aproxima um nível no ponto; de novo, volta.
        const u = this.ultimoToque; if (toque && u && this.time.now - u.t < 300 && Math.hypot(p.x - u.x, p.y - u.y) < 30) { this.ultimoToque = null; this.zoomDuplo(p); }
        else if (toque) { this.ultimoToque = { t: this.time.now, x: p.x, y: p.y }; this.tocou(p); }
        this.arrastando = null; this.soltouEm = this.time.now; });
      this.ajustarEscala(); this.scale.on('resize', () => this.ajustarEscala());
      const [x, y] = iso(this.mapa.pontos.porta.x, this.mapa.pontos.porta.y); cam.centerOn(x, y);
    }
    // O teclado e o controle (Bluetooth) funcionam sempre, sem nada na tela; nunca enquanto o Jean digita num campo.
    montarTeclado() {
      const digitando = () => { const a = document.activeElement; return a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName); };
      const DIR = { ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, w: 1, a: 1, s: 1, d: 1, W: 1, A: 1, S: 1, D: 1 };
      this.aoTecla = (e) => { if (digitando() || e.metaKey || e.ctrlKey || e.altKey) return;
        if (DIR[e.key]) { this.teclas.add(e.key.toLowerCase().replace('arrow', '')); if (this.podeAndar()) e.preventDefault(); return; }
        const b = { Enter: 'A', ' ': 'A', Escape: 'B', Backspace: 'B', c: 'select', C: 'select', m: 'start', M: 'start' }[e.key]; if (b && op.aoBotao) { e.preventDefault(); op.aoBotao(b); } };
      this.aoSoltarTecla = (e) => { this.teclas.delete(String(e.key).toLowerCase().replace('arrow', '')); if (DIR[e.key] && !this.teclas.size) this.jeanParou(); };
      window.addEventListener('keydown', this.aoTecla); window.addEventListener('keyup', this.aoSoltarTecla);
      this.events.once('destroy', () => { window.removeEventListener('keydown', this.aoTecla); window.removeEventListener('keyup', this.aoSoltarTecla); });
    }
    podeAndar() { return this.camera === 'jean' && this.jean.visivel && !this.jean.preso && !this.construindo && !this.movendo; }
    cameraSolta() { return this.camera === 'livre' || !!this.construindo; }
    pontoLivre() { const c = this.cameras.main; if (this.cameraSolta() && !this.livre) this.livre = { x: c.midPoint.x, y: c.midPoint.y }; return { lx: this.livre ? this.livre.x : 0, ly: this.livre ? this.livre.y : 0 }; }
    distPinca() { const a = this.input.pointer1, b = this.input.pointer2; return Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)); }
    // Os níveis de zoom: 4, sempre inteiros (a arte de pixel nítida), de um abaixo a dois acima do automático.
    mudarZoom(d) { const a = this.auto || 3; this.escalaManual = Math.max(Math.max(1, a - 1), Math.min(a + 2, (this.escala || a) + d)); this.ajustarEscala(); }
    zoomDuplo(p) {
      const w = this.cameras.main.getWorldPoint(p.x, p.y);
      if ((this.escala || 0) > (this.auto || 3)) { this.escalaManual = null; this.ajustarEscala(); return; }
      this.mudarZoom(1); this.levarA(w.x, w.y);
    }
    // Leva o centro da câmera a um ponto do mundo: na câmera solta, o ponto; seguindo alguém, o desvio (que volta sozinho).
    levarA(x, y) { const c = this.cameras.main; if (this.cameraSolta()) { this.livre = this.preso({ x, y }); return; }
      this.desvio.x = Math.max(-420, Math.min(420, this.desvio.x + x - c.midPoint.x)); this.desvio.y = Math.max(-260, Math.min(260, this.desvio.y + y - c.midPoint.y)); this.soltouEm = this.time.now; }
    preso(pt) { const L = this.limites; return L ? { x: Math.max(L.x0, Math.min(L.x1, pt.x)), y: Math.max(L.y0, Math.min(L.y1, pt.y)) } : pt; }
    centralizar() { this.fixo = null; this.desvio.x = 0; this.desvio.y = 0; if (!this.cameraSolta()) { this.livre = null; return; }
      const j = this.jean; const quem = this.camera === 'jean' && j.visivel ? iso(j.x, j.y) : iso(this.pepper.x, this.pepper.y); this.livre = this.preso({ x: quem[0], y: quem[1] - 16 }); }
    // "Ver tudo": a casa inteira na tela, no maior nível inteiro que cabe.
    verTudo() { const L = this.limites; if (!L) return; const c = this.cameras.main;
      this.escalaManual = Math.max(1, Math.floor(Math.min(this.scale.width / (L.x1 - L.x0), this.scale.height / (L.y1 - L.y0)))); this.ajustarEscala();
      if (!this.cameraSolta()) this.camera = 'livre'; this.livre = { x: (L.x0 + L.x1) / 2, y: (L.y0 + L.y1) / 2 }; this.fixo = null; c.centerOn(this.livre.x, this.livre.y); }
    chaoNaTela(p) { const w = this.cameras.main.getWorldPoint(p.x, p.y); const x = (w.y / BY + w.x / BX) / 2, y = (w.y / BY - w.x / BX) / 2; return [x, y]; }
    // O toque: o item de cima (pelo pixel), ou o gato; no modo mover, onde soltar (DEC-175); no chão, o Jean anda (DEC-176).
    tocou(p) {
      const w = this.cameras.main.getWorldPoint(p.x, p.y);
      if (this.movendo) { const [x, y] = this.chaoEm(w.x, w.y); if (aoSoltar) aoSoltar(this.movendo.id, x, y, !!this.movendo.espelhar, this.movendo.tirar); return; }
      const alvo = this.alvoEm(p);
      if (alvo && aoTocar) { const { id, s } = alvo; if (!id.startsWith('pessoa:')) this.amassar(s); const pt = this.naTela(s.x, s.y - s.displayHeight * 0.6); aoTocar(id, pt.x, pt.y); return; }
      if (this.podeAndar()) { const [x, y] = this.chaoNaTela(p); this.andarJeanAte(x, y); }
    }
    // A sensação do toque (J3, o "game feel"): o objeto amassa e volta, na hora.
    amassar(s) { if (!s || !this.tweens) return; this.tweens.killTweensOf(s); s.setScale(1.08, 0.86); this.tweens.add({ targets: s, scaleX: 1, scaleY: 1, duration: 180, ease: 'Back.easeOut' }); }
    // O que está embaixo do dedo: o item de cima (pelo pixel), o gato ou uma pessoa.
    alvoEm(p) {
      const w = this.cameras.main.getWorldPoint(p.x, p.y);
      // O pixel do item manda; sem pixel embaixo do dedo, vale o item menor cuja caixa contém o toque (item pequeno, layout).
      const cand = [], perto = [];
      const testa = (id, s) => { if (!s || !s.visible) return; const b = s.getBounds(); if (!b.contains(w.x, w.y)) return;
        let lx = Math.floor((w.x - b.x)), ly = Math.floor((w.y - b.y)); if (s.flipX) lx = s.width - 1 - lx; const a = this.textures.getPixelAlpha(lx, ly, s.texture.key);
        if (a > 0) cand.push({ id, d: s.depth, s }); else if (!id.startsWith('pessoa:')) perto.push({ id, d: -b.width * b.height, s }); };
      const ehChao = (id) => { const it = this.mapa.itens.find((i) => i.id === id); return it && (it.chao || it.modelo === 'escada'); };
      for (const [id, s] of Object.entries(this.sprites)) { const it = this.mapa.itens.find((i) => i.id === id); if (it && !it.fora && !(this.podeAndar() && ehChao(id))) testa(id, s); }
      if (this.gato.vivo && this.dela) testa('gato', this.spGato);
      // As pessoas (rodada 9, parte I; adendo 10, item 7): tocar em alguém abre a ficha; no celular dela, a tela dele.
      testa('pessoa:pepper', this.spPepper); testa('pessoa:celular', this.spCel); testa('pessoa:celular', this.spCelCriado); testa('pessoa:morgan', this.spMorgan); testa('pessoa:jean', this.spJean);
      (this.spVisitas || []).forEach((sp, k) => { if (this.visitas[k] && this.visitas[k].nome) testa('pessoa:' + this.visitas[k].nome, sp); });
      cand.sort((a, b) => b.d - a.d); if (!cand.length && !this.podeAndar()) cand.push(...perto.sort((a, b) => b.d - a.d));
      return cand[0] || null;
    }
    naTela(wx, wy) { const c = this.cameras.main; return { x: (wx - c.worldView.x) * c.zoom, y: (wy - c.worldView.y) * c.zoom }; }
    chaoEm(wx, wy) { const x = (wy / BY + wx / BX) / 2, y = (wy / BY - wx / BX) / 2; return [Math.round(x * 4) / 4, Math.round(y * 4) / 4]; }
    // ---- o Jean anda: até o ponto tocado, pelo caminho; no fim, se parou numa escada, muda de andar
    // Sempre pelo caminho da grade, saindo pelas portas; sem caminho, ele não anda e aparece um aviso curto (DEC-198).
    andarJeanAte(x, y) { const j = this.jean; j.depois = null; const c = caminho(this.g, j, { x, y }, true); if (!c.length) { if (op.aoSemCaminho) op.aoSemCaminho(); return false; } j.caminho = c; j.mexeuEm = this.time.now; return true; }
    // Andar até um item e fazer a ação ao chegar (J3): o lugar de usar fica livre no caminho (o sofá, a cama).
    andarEFazer(x, y, fn) { const j = this.jean; if (!j.visivel) return false; if (Math.hypot(j.x - x, j.y - y) < 0.35) { j.depois = null; fn(); return true; }
      const livres = this.itensEm({ x, y }); const g = livres.length ? grade(this.mapa, livres) : this.g; const c = caminho(g, j, { x, y }, true);
      if (!c.length) { if (op.aoSemCaminho) op.aoSemCaminho(); return false; } j.caminho = c; j.mexeuEm = this.time.now; j.depois = fn; return true; }
    jeanParou() {
      const j = this.jean; j.mexeuEm = this.time.now; if (!j.visivel) return;
      const esc = this.mapa.itens.find((i) => i.modelo === 'escada' && j.x >= i.x && j.x <= i.x + i.w && j.y >= i.y && j.y <= i.y + i.d);
      if (esc) { const outro = this.andar === (esc.andar || 0) ? this.andar + 1 : this.andar - 1; j.andar = outro; j.y = this.andar < outro ? esc.y + 0.3 : esc.y + esc.d - 0.3; this.remontar(this.mapaTodo, outro); if (op.aoAndar) op.aoAndar(outro); }
      const pr = op.aoAndou ? op.aoAndou(Math.round(j.x * 100) / 100, Math.round(j.y * 100) / 100, j.andar) : null;
      // a ação que esperava a chegada vai depois de o servidor saber onde ele está (nunca as duas juntas)
      if (j.depois) { const f = j.depois; j.depois = null; Promise.resolve(pr).then((c) => { if (c !== null) f(); }); }
    }
    // O passo livre (o polegar, o teclado, o controle): anda na direção, sem atravessar parede nem móvel.
    passoLivre(dx, dy, dt) {
      const j = this.jean; const v = 2.4 * dt / 1000; const g = this.g, N = g.N, ox = g.x0 || 0, oy = g.y0 || 0;
      const tenta = (nx, ny) => { const ax = Math.floor((j.x - ox) * N), ay = Math.floor((j.y - oy) * N), bx = Math.floor((nx - ox) * N), by = Math.floor((ny - oy) * N);
        if (ax === bx && ay === by) return true; if (ax !== bx && ay !== by) return g.pode(ax, ay, bx, ay) && g.pode(bx, ay, bx, by); return g.pode(ax, ay, bx, by); };
      const nx = j.x + dx * v, ny = j.y + dy * v;
      if (tenta(nx, ny)) { j.x = nx; j.y = ny; } else if (tenta(nx, j.y)) j.x = nx; else if (tenta(j.x, ny)) j.y = ny; else return false;
      if (Math.abs(dx) > Math.abs(dy)) { j.lado = dx > 0 ? 'frente' : 'costas'; j.esp = dx < 0; } else { j.lado = dy > 0 ? 'frente' : 'costas'; j.esp = dy > 0; }
      j.mexeuEm = this.time.now; return true;
    }
    // O modo mover: o item fica meio transparente e um fantasma segue o dedo até o lugar novo.
    iniciarMover(item, tirar) {
      this.cancelarMover(); const it = typeof item === 'string' ? this.mapa.itens.find((i) => i.id === item) : item; if (!it) return;
      this.texturaItem(it); const k = 'item-' + it.id; const [ax, ay] = this.ancoras[k];
      this.movendo = { id: it.id, it, espelhar: false, tirar: !!tirar, ax, ay };
      this.fantasma = this.add.image(0, 0, k).setOrigin(ax, ay).setAlpha(0.7).setDepth(990).setTint(0xb7f0a0);
      if (this.sprites[it.id]) this.sprites[it.id].setAlpha(0.35);
      const [wx, wy] = iso(it.x || 4, it.y || 5, it.z || 0); this.fantasma.setPosition(wx, wy);
    }
    girarMover() { const m = this.movendo; if (!m) return; m.espelhar = !m.espelhar; this.fantasma.setFlipX(m.espelhar !== !!m.it.espelhado).setOrigin(m.espelhar !== !!m.it.espelhado ? 1 - m.ax : m.ax, m.ay); }
    moverFantasma(p) { const w = this.cameras.main.getWorldPoint(p.x, p.y); const [x, y] = this.chaoEm(w.x, w.y); const [wx, wy] = iso(x, y); this.fantasma.setPosition(wx, wy); }
    // O fantasma do construtor (J2): o item segue o dedo, verde onde cabe e vermelho onde não cabe.
    fantasmaConstrutor(it, erro) {
      if (!it) { if (this.fantasmaC) this.fantasmaC.destroy(); this.fantasmaC = null; if (this.escondido) this.escondido.setAlpha(1); this.escondido = null; return; }
      this.texturaItem(it); const k = 'item-' + it.id; const [ax, ay] = this.ancoras[k] || [0.5, 1];
      if (!this.fantasmaC || this.fantasmaC.texture.key !== k) { if (this.fantasmaC) this.fantasmaC.destroy(); this.fantasmaC = this.add.image(0, 0, k).setAlpha(0.85).setDepth(990);
        const s = this.sprites[it.id]; if (s) { s.setAlpha(0.3); this.escondido = s; } }
      const [wx, wy] = iso(it.x, it.y, it.z || 0); this.fantasmaC.setOrigin(it.espelhado ? 1 - ax : ax, ay).setFlipX(!!it.espelhado).setPosition(wx, wy).setTint(erro ? 0xff5a5a : 0xb7f0a0);
    }
    cancelarMover() { if (this.fantasma) this.fantasma.destroy(); this.fantasma = null; if (this.movendo && this.sprites[this.movendo.id]) this.sprites[this.movendo.id].setAlpha(1); this.movendo = null; }
    // A escala inteira (DEC-173): celular, pelo menos 180 pixels do jogo na menor dimensão; tablet, 300.
    ajustarEscala(forcar) {
      const w = this.scale.width, h = this.scale.height, menor = Math.min(w, h);
      const auto = menor < 600 ? (menor < 330 ? 2 : 3) : menor >= 1100 ? 5 : 4;
      this.auto = auto; this.escala = forcar || this.escalaManual || auto; this.cameras.main.setZoom(this.escala).setRoundPixels(true);
    }
    // ---- o construtor (DEC-176): a grade e as marcas (o cômodo que se arrasta, a parede, o item escolhido)
    marcar(formas = []) {
      const g = this.marcas; g.clear(); if (!this.construindo) return;
      const m = this.mapa; const ar = m.exterior ? m.exterior.area : [0, 0, m.largura, m.fundo];
      g.lineStyle(1, 0xffffff, 0.12);
      for (let x = Math.max(ar[0], -2); x <= Math.min(ar[2], 40); x++) { const a = iso(x, Math.max(ar[1], -2)), b = iso(x, Math.min(ar[3], 40)); g.lineBetween(a[0], a[1], b[0], b[1]); }
      for (let y = Math.max(ar[1], -2); y <= Math.min(ar[3], 40); y++) { const a = iso(Math.max(ar[0], -2), y), b = iso(Math.min(ar[2], 40), y); g.lineBetween(a[0], a[1], b[0], b[1]); }
      for (const f of formas) {
        const cor = f.erro ? 0xff5a5a : 0x7dff9b;
        if (f.tipo === 'area') { const [x0, y0, x1, y1] = f.area; const pts = [iso(x0, y0), iso(x1, y0), iso(x1, y1), iso(x0, y1)]; g.fillStyle(cor, 0.25).lineStyle(1, cor, 0.9);
          g.fillPoints(pts.map(([x, y]) => ({ x, y })), true); g.strokePoints(pts.map(([x, y]) => ({ x, y })), true); }
        if (f.tipo === 'linha') { const a = iso(...f.de), b = iso(...f.para); g.lineStyle(3, cor, 0.95).lineBetween(a[0], a[1], b[0], b[1]); }
      }
    }
    // O que o servidor mandou (o 68): o mapa, as luzes, o que ela faz e onde o Jean está.
    atualizar(c) {
      this.estado = c;
      if (c.mapa && (c.mapa.versao !== this.mapaTodo.versao || (c.mapa.id || 'casa-pepper') !== (this.mapaTodo.id || 'casa-pepper')) && !this.construindo) {
        const outroMapa = (c.mapa.id || 'casa-pepper') !== (this.mapaTodo.id || 'casa-pepper'); this.remontar(c.mapa, outroMapa ? 0 : this.andar); if (outroMapa) { this.pepper.visivel = false; this.pepper.saiuDoPrivado = false; } }
      this.clima = c.clima || 'sol';
      this.aplicarItens(c);
      this.atualizarJean(c.jean);
      if (!this.dela) return;
      const ca = c.casa || {}, D = this.detalhe, it = c.itens || {};
      const vis = (s, v) => s && s.setVisible(!!v);
      vis(D.louca, ca.louca > 0); vis(D.lixo, ca.lixo >= 60); vis(D.roupa, ca.roupa > 0); vis(D.lencol, ca.arrumada === false && (c.pepper || {}).pose !== 'deitada');
      const areia = it['caixa-areia'] || {}; vis(D.areia, areia.sujeira >= 40); vis(D.mancha, areia.fora); D.moscas.forEach((m) => vis(m, areia.sujeira >= 60 || areia.fora));
      vis(D.racao, (it['potes-gato'] || {}).racao > 0);
      if (c.reacao) this.pepper.balaoTemp = { tipo: c.reacao === 'assombracao' ? 'susto' : c.reacao === 'viu_jean' ? 'coracao' : 'pergunta', ate: this.time.now + 20000 };
      const gs = c.gato; this.gato.vivo = !!gs && !!this.mapa.pontos.gato; this.spGato.setVisible(this.gato.vivo); if (gs && gs.acao !== this.gato.acao) { this.gato.acao = gs.acao; this.gato.proxima = 0; }
      const pp = c.pepper || {}; const m = this.mapa;
      this.definirPepper(pp.veste || {}); this.pepper.usando = !!(pp.acao && pp.acao.fase === 'fazendo' && USANDO.has(pp.acao.tipo));
      this.b = { sentidos: pp.sentidos || {}, celular: pp.celular || null, prato: pp.prato || null, leva: (pp.acao || {}).leva || null };
      if (this.andar !== 0) { this.pepper.visivel = false; this.pepper.saiuDoPrivado = false; this.morgan.visivel = false; this.visitas.forEach((v) => { v.visivel = false; }); return; }
      const direto = !this.vistaEm || Date.now() - this.vistaEm > 120000;
      this.atualizarMorgan(pp.morgan, direto); this.atualizarVisitas(pp.visitas, direto);
      let destino = null, pose = 'parada', dir = 'se';
      // Indo, a rota do servidor manda: o fim dela é o lugar (DEC-188, item 2).
      const rota0 = !pp.fora && !pp.privado && (pp.acao || {}).fase !== 'fazendo' ? pontosDe(pp.rota) : null; const rota = rota0 && rota0.length > 1 ? rota0 : null;
      if (pp.fora) destino = { ...m.pontos.porta, sumir: true };
      else if (pp.privado) destino = { ...m.pontos.banheiro || { x: 10.6, y: 8.5 }, sumir: true, privado: true };
      else {
        // Fazendo, o servidor manda o lugar exato (x, y); sem objeto (espreguiçar, olhar a janela), o lugar é o ponto dele.
        const temXY = pp.x != null && pp.y != null && Number.isFinite(Number(pp.x)) && Number.isFinite(Number(pp.y)); const fazendo = temXY && (pp.acao || {}).fase === 'fazendo';
        const semObjeto = !pp.objeto && (fazendo || rota);
        const it2 = m.itens.find((i) => i.id === pp.objeto) || (semObjeto ? null : m.itens.find((i) => i.id === 'sofa') || m.itens.find((i) => !i.fora && !i.chao));
        if (!it2 && !semObjeto) return; const u = (it2 && (it2.uso || [])[0]) || (fazendo || !it2 ? { x: Number(pp.x), y: Number(pp.y) } : { x: it2.x + it2.w / 2, y: it2.y + it2.d + 0.3 });
        destino = { x: fazendo ? Number(pp.x) : u.x, y: fazendo ? Number(pp.y) : u.y, item: it2 ? it2.id : null }; pose = u.pose || (pp.pose !== 'andando' && pp.pose) || 'parada'; dir = u.dir || pp.dir || 'se'; }
      if (rota) { const fim = rota[rota.length - 1]; destino = { ...destino, x: fim.x, y: fim.y }; }
      const p = this.pepper; p.balao = pp.balao || null; p.privado = false;
      // O jogo é a janela de um mundo que já está rodando (conserto de 26/11, B-008): ao abrir, ao voltar do segundo plano,
      // ao reconectar ou ao voltar ao térreo, ela já está no lugar da atividade, na pose. Só entra pela porta quando chega
      // da rua de verdade (ela estava fora e voltou); no meio de um trajeto (x e y do servidor), continua dali; ao sair do
      // banheiro, sai de lá. Depois de mais de 2 minutos sem notícia, vai direto para onde o servidor diz.
      const agora = Date.now(); const sumiu = this.vistaEm && agora - this.vistaEm > 120000; this.vistaEm = agora;
      const estavaFora = p.estavaFora === true; p.estavaFora = !!pp.fora;
      if (!pp.fora && (!p.visivel || sumiu)) {
        const tx = Number(pp.x), ty = Number(pp.y);
        if (!p.visivel && estavaFora) { p.x = m.pontos.porta.x; p.y = m.pontos.porta.y; }
        else if (pp.x != null && pp.y != null && Number.isFinite(tx) && Number.isFinite(ty)) { p.x = tx; p.y = ty; }
        else if (!(p.saiuDoPrivado && !sumiu)) { p.x = destino.x; p.y = destino.y; p.alvo = destino; p.poseFinal = pose; p.dirFinal = dir; p.visivel = true; p.saiuDoPrivado = false; p.fade = null; this.chegou(); return; }
        p.visivel = true; p.saiuDoPrivado = false; p.alvo = null; p.fade = null;
        if (Math.hypot(p.x - destino.x, p.y - destino.y) < 0.05) { p.alvo = destino; p.poseFinal = pose; p.dirFinal = dir; this.chegou(); return; }
      }
      const srv = Date.parse(c.agora) || Date.now(); const desde = (pp.acao || {}).desde || null;
      // O vigia (DEC-190): ninguém alcança nada, ela esmaece e aparece no lugar livre.
      if (pp.esmaecer && desde !== p.esmaecerDe) { p.esmaecerDe = desde; p.alvo = destino; p.poseFinal = pose; p.dirFinal = dir; this.esmaecer(destino); return; }
      // O desvio (DEC-188, item 2): ocupada, ela vai até o item, mexe e volta, sem largar o que fazia.
      const dv = pp.desvio; const rd = dv && pontosDe(dv.rota);
      if (rd && dv.em !== p.desvioEm) { p.desvioEm = dv.em; const resto = restoDaRota(rd, (srv - Date.parse(dv.em)) / 1000 * VEL_ROTA);
        if (resto.length > 1) { const livres = [destino.item, p.alvo && p.alvo.item].filter(Boolean); p.alvo = destino; p.poseFinal = pose; p.dirFinal = dir; p.pose = 'andando'; p.vel = VEL_ROTA; p.caminho = this.ligar(p, resto, livres); return; } }
      if (p.alvo && p.alvo.x === destino.x && p.alvo.y === destino.y) return;
      // O item onde ela está (o sofá, a cama) não a prende: ela sai dele.
      const onde = p.alvo && p.alvo.item; p.alvo = destino; p.poseFinal = pose; p.dirFinal = dir; p.pose = 'andando';
      if (rota) { p.vel = VEL_ROTA; const resto = restoDaRota(rota, projetar(rota, pp.x != null ? Number(pp.x) : p.x, pp.y != null ? Number(pp.y) : p.y));
        p.caminho = this.ligar(p, resto.length ? resto : [rota[rota.length - 1]], [destino.item, onde].filter(Boolean)); }
      else { p.vel = 1.6; p.caminho = caminho(grade(m, [destino.item, onde, ...this.itensEm(destino), ...this.itensEm(p)].filter(Boolean)), p, destino); }
      // Sem caminho, nunca um pulo: ela esmaece e aparece lá.
      if (!p.caminho.length) { if (Math.hypot(p.x - destino.x, p.y - destino.y) < 0.05) this.chegou(); else this.esmaecer(destino); }
    }
    aplicarItens(c) { for (const l of this.luzes) { const e = (c.itens || {})[l.id] || {}; l.ligada = e.ligada === true; l.brilho = Number.isFinite(e.brilho) ? e.brilho : 100; if (e.cor) l.cor = e.cor; }
      const it = c.itens || {}; this.tv = it.tv || {}; this.toca = it['toca-discos'] || {}; this.redesenharLuz(); }
    // Onde o Jean está, pelo servidor. O que ele acabou de andar no aparelho vale por 4 segundos (o servidor ainda não sabe).
    atualizarJean(s) {
      const j = this.jean; if (!s) { j.visivel = false; return; }
      this.definirJean(s.aparencia, s.veste); j.acao = s.acao || null;
      const aqui = !s.voando && s.mapa_id === (this.mapaTodo.id || 'casa-pepper');
      j.preso = !!(s.fora || s.esperando); j.fora = s.fora || null; j.esperando = !!s.esperando;
      if (!aqui) { j.visivel = false; return; }
      const sx = Number(s.x), sy = Number(s.y), sa = Number(s.andar) || 0;
      if (!j.visivel || j.preso || (this.time.now - j.mexeuEm > 4000 && !j.caminho.length && !this.joy)) {
        if (!j.visivel || Math.hypot(sx - j.x, sy - j.y) > 3 || j.andar !== sa) { j.x = sx; j.y = sy; j.caminho = []; } else if (Math.hypot(sx - j.x, sy - j.y) > 0.2) j.caminho = caminho(this.g, j, { x: sx, y: sy });
        j.andar = sa; }
      j.visivel = true;
    }
    chegou() { const p = this.pepper; p.pose = p.poseFinal; p.caminho = []; if (p.alvo.sumir) { p.visivel = false; p.privado = !!p.alvo.privado; p.saiuDoPrivado = !!p.alvo.privado; }
      const d = p.dirFinal; p.lado = d === 'ne' || d === 'nw' ? 'costas' : 'frente'; p.esp = d === 'sw' || d === 'nw'; }
    andarPor(o, dt, vel) {
      const alvo = o.caminho[0]; if (!alvo) return false;
      const dx = alvo.x - o.x, dy = alvo.y - o.y, dist = Math.hypot(dx, dy), passo = vel * dt / 1000;
      if (Math.abs(dx) > Math.abs(dy)) { o.lado = dx > 0 ? 'frente' : 'costas'; o.esp = dx < 0; } else if (dy !== 0) { o.lado = dy > 0 ? 'frente' : 'costas'; o.esp = dy > 0; }
      if (dist <= passo) { o.x = alvo.x; o.y = alvo.y; o.caminho.shift(); } else { o.x += dx / dist * passo; o.y += dy / dist * passo; }
      return true;
    }
    // A direção pedida agora: o polegar, os botões fixos, o teclado ou o controle (o primeiro que tiver).
    direcaoAgora() {
      if (this.joy && Math.hypot(this.joy.dx, this.joy.dy) > 6) return direcaoNoChao(this.joy.dx, this.joy.dy);
      if (this.dirExterna[0] || this.dirExterna[1]) return direcaoNoChao(...this.dirExterna);
      const t = this.teclas; const sx = (t.has('right') || t.has('d') ? 1 : 0) - (t.has('left') || t.has('a') ? 1 : 0), sy = (t.has('down') || t.has('s') ? 1 : 0) - (t.has('up') || t.has('w') ? 1 : 0);
      if (sx || sy) return direcaoNoChao(sx, sy);
      const pad = navigator.getGamepads ? [...navigator.getGamepads()].find((g) => g) : null; if (!pad) return null;
      const bt = (k) => !!(pad.buttons[k] && pad.buttons[k].pressed);
      for (const [k, b] of [[0, 'A'], [1, 'B'], [8, 'select'], [9, 'start']]) { if (bt(k) && !this.gp[k] && op.aoBotao) op.aoBotao(b); this.gp[k] = bt(k); }
      let ax = pad.axes[0] || 0, ay = pad.axes[1] || 0; if (bt(14)) ax = -1; if (bt(15)) ax = 1; if (bt(12)) ay = -1; if (bt(13)) ay = 1;
      const tinha = this.gp.mexendo; this.gp.mexendo = Math.hypot(ax, ay) > 0.3; if (tinha && !this.gp.mexendo) this.jeanParou();
      return this.gp.mexendo ? direcaoNoChao(ax, ay) : null;
    }
    update(t, dt) {
      this.vivo.atualizar(t);
      const p = this.pepper; const cam = this.cameras.main;
      if (p.caminho.length) { this.andarPor(p, dt, p.vel || 1.6); p.t += dt; if (p.t > 140) { p.t = 0; p.quadro = (p.quadro + 1) % 4; } if (!p.caminho.length) this.chegou(); }
      let alfa = 1; if (p.fade) { const f = (t - p.fade.t0) / 900; if (f >= 0.5 && !p.fade.trocou) { p.fade.trocou = true; p.x = p.fade.x; p.y = p.fade.y; if (p.alvo) this.chegou(); }
        alfa = f < 0.5 ? 1 - 2 * f : Math.min(1, 2 * f - 1); if (f >= 1) p.fade = null; }
      const deitada = p.pose === 'deitada' && !p.caminho.length; const dela = this.dela && this.andar === 0;
      const [wx, wy] = iso(p.x, p.y);
      this.spPepper.setVisible(dela && p.visivel && !deitada).setPosition(wx, wy).setDepth(profundidadePessoa(p.x, p.y) + (p.pose === 'sentada' ? 0.6 : 0))
        .setTexture(`pepper-${p.lado}-${p.caminho.length ? 'andando' + p.quadro : p.pose === 'sentada' ? 'sentada' : p.usando ? 'usando' : 'parada'}${p.esp ? '-esp' : ''}`).setAlpha(alfa);
      // a luz da TV pisca no rosto de quem assiste (adendo 11)
      const vendoTv = dela && !p.caminho.length && p.pose === 'sentada' && !!(this.tv || {}).ligada && (((this.estado || {}).pepper || {}).acao || {}).tipo === 'tv';
      if (vendoTv && this.vivo.ligada()) this.spPepper.setTint(Phaser.Display.Color.GetColor(...[0, 1, 2].map((k) => 215 + Math.round(40 * Math.sin(t / 90 + k * 2 + Math.sin(t / 37)))))); else this.spPepper.clearTint();
      if (dela && deitada) { const cama = this.mapa.itens.find((i) => i.id === (p.alvo && p.alvo.item)) || { x: p.x, y: p.y, w: 1 }; const [hx, hy] = iso(cama.x + 0.55, cama.y + 0.55, 17);
        this.spCabeca.setVisible(true).setPosition(hx, hy).setDepth(profundidade(cama) + 0.01); } else this.spCabeca.setVisible(false);
      const topo = deitada ? [this.spCabeca.x, this.spCabeca.y - 10] : [wx, wy - 34];
      const temp = p.balaoTemp && p.balaoTemp.ate > t ? p.balaoTemp.tipo : null;
      const bal = p.caminho.length ? null : temp || (deitada ? 'zzz' : p.balao);
      const temBal = !!bal && this.textures.exists('balao-' + bal);
      this.spBalao.setVisible(dela && p.visivel && temBal && !p.fade).setPosition(topo[0] + 4, topo[1] + Math.round(Math.sin(t / 500))); if (temBal) this.spBalao.setTexture('balao-' + bal);
      this.spPorta.setVisible(dela && (!!p.privado || this.morgan.banho) && !!this.portaBanheiro);
      this.viverJuntos(t, dt, dela); this.viverSentidos(t, dela, deitada, wx, wy, alfa); if (this.portaBanheiro) this.spPorta.setPosition(this.portaBanheiro.wx, this.portaBanheiro.wy);
      if (dela) this.viverGato(t, dt); else { this.spGato.setVisible(false); this.spBalaoGato.setVisible(false); }
      this.viverJean(t, dt); this.vidaMiuda(t, dt);
      // a câmera: segue a Pepper, o Jean ou fica livre; o desvio do dedo volta sozinho
      if (!this.arrastando && t - (this.soltouEm || 0) > 2000) { this.desvio.x *= 0.95; this.desvio.y *= 0.95; }
      const j = this.jean; const [jx, jy] = iso(j.x, j.y);
      const fixo = this.fixo === 'gato' ? this.spGato : this.fixo && this.sprites[this.fixo];
      let foco = fixo ? [fixo.x, fixo.y - 16] : this.camera === 'jean' && j.visivel ? [jx, jy - 16] : dela && p.visivel ? [wx, wy - 16] : iso(this.mapa.pontos.fora.x, this.mapa.pontos.fora.y);
      if (this.cameraSolta() && !fixo) { if (!this.livre) this.livre = { x: cam.midPoint.x, y: cam.midPoint.y };
        // Desenhando ou movendo um item perto da borda da tela, a câmera vai junto.
        const q = this.ponteiro; if (q && q.isDown && (this.construindo === 'desenhar' || this.movendo || this.capturado) && !this.pinca) { const m = 40, v = 6 / cam.zoom;
          const bx = q.x < m ? -v : q.x > this.scale.width - m ? v : 0, by = q.y < m ? -v : q.y > this.scale.height - m ? v : 0;
          if (bx || by) this.livre = this.preso({ x: this.livre.x + bx, y: this.livre.y + by }); }
        foco = [this.livre.x, this.livre.y]; } else this.livre = null;
      const dv = this.cameraSolta() ? { x: 0, y: 0 } : this.desvio;
      cam.scrollX += ((foco[0] + dv.x - cam.width / 2) - cam.scrollX) * 0.08;
      cam.scrollY += ((foco[1] + dv.y - cam.height / 2) - cam.scrollY) * 0.08;
      if (aoDiagnostico) aoDiagnostico({ fps: this.game.loop.actualFps, luzes: this.diag.luzes, total: this.diag.total, escala: this.escala, w: Math.round(this.scale.width / this.escala), h: Math.round(this.scale.height / this.escala),
        renderer: this.game.renderer.type === Phaser.WEBGL ? 'WebGL' : 'Canvas' });
    }
    // Uma figura que anda sozinha (a Morgan, as visitas): o passo, a pose no lugar e a profundidade.
    viverFigura(o, sp, prefixo, t, dt, vel, dela, bonus) {
      if (o.caminho.length) { this.andarPor(o, dt, vel); o.t += dt; if (o.t > 150) { o.t = 0; o.quadro = (o.quadro + 1) % 4; }
        if (!o.caminho.length) { if (o.saindo) { o.visivel = false; o.saindo = false; } else { o.lado = 'frente'; o.esp = false; } } }
      const anda = o.caminho.length > 0; const vis = dela && o.visivel; const [x, y] = iso(o.x, o.y);
      sp.setVisible(vis).setPosition(x, y).setDepth(profundidadePessoa(o.x, o.y) + (!anda && o.pose === 'sentada' ? bonus : 0))
        .setTexture(`${prefixo}-${o.lado}-${anda ? 'andando' + o.quadro : o.pose === 'sentada' ? 'sentada' : 'parada'}${o.esp ? '-esp' : ''}`);
      return { vis, anda, x, y };
    }
    // A Morgan e as visitas (DEC-188, item 5). A Morgan à mesa senta do outro lado (atrás da mesa, sem o bônus de sentar).
    viverJuntos(t, dt, dela) {
      const g = this.morgan; const r = this.viverFigura(g, this.spMorgan, 'morgan', t, dt, 1.4, dela, g.objeto === 'mesa-jantar' ? 0 : 0.6);
      const bm = r.vis && !r.anda && g.balao && this.textures.exists('balao-' + g.balao) ? g.balao : null;
      this.spBalaoMorgan.setVisible(!!bm).setPosition(r.x + 3, r.y - 26 + Math.round(Math.sin(t / 450))); if (bm) this.spBalaoMorgan.setTexture('balao-' + bm);
      const vs = this.visitas.map((v, k) => this.viverFigura(v, this.spVisitas[k], 'visita' + k, t, dt, 1.4, dela, 0.6));
      // a conversa: um balãozinho de cada vez, em quem está sentado
      const quem = vs.map((v, k) => (v.vis && !v.anda ? k : -1)).filter((k) => k >= 0); const fala = quem.length ? quem[Math.floor(t / 4000) % quem.length] : -1;
      const mostra = fala >= 0 && Math.floor(t / 2000) % 2 === 0; this.spBalaoVisita.setVisible(mostra); if (mostra) this.spBalaoVisita.setPosition(vs[fala].x + 4, vs[fala].y - 34 + Math.round(Math.sin(t / 500)));
    }
    // Os sentidos e as coisas dela (DEC-188, itens 6 e 7): a fumaça da panela, o vapor do banho, o celular (na mão, no
    // criado-mudo), o que ela leva andando, o prato na mesa e a cena genérica da TV.
    viverSentidos(t, dela, deitada, wx, wy, alfa) {
      const b = this.b || {}; const S = b.sentidos || {}; const p = this.pepper; const acha = (id, modelo) => this.mapa.itens.find((i) => i.id === id) || this.mapa.itens.find((i) => i.modelo === modelo);
      const nuvem = (lista, base, on, tempo) => lista.forEach((s, k) => { if (!on || !base) { s.setVisible(false); return; } const f = ((t / tempo) + k / lista.length) % 1;
        s.setVisible(true).setPosition(base[0] + Math.round(Math.sin(f * 5 + k * 2) * 4), base[1] - Math.round(f * 22)).setAlpha((1 - f) * 0.85); });
      const fogao = acha('fogao', 'fogao'); nuvem(this.fumaca, fogao && iso(fogao.x + 0.35, fogao.y + 0.35, 18), dela && !!S.fumaca, 1500);
      const banheira = acha('banheira', 'banheira'); const pb = this.portaBanheiro;
      nuvem(this.vapor, pb ? [pb.wx, pb.wy - 4] : banheira && iso(banheira.x + 0.8, banheira.y + 0.5, 14), dela && !!S.vapor, 1900);
      // na mão: o que ela leva andando (o prato, a louça, as compras), senão o celular quando ela está nele
      const vista = dela && p.visivel && !p.privado && !deitada; const mao = p.esp ? -4 : 4; const sentada = p.pose === 'sentada' && !p.caminho.length;
      const leva = p.caminho.length && { prato: 'prato_mao', 'louça': 'louca_mao', louca: 'louca_mao', compras: 'sacola', mercado: 'sacola', farmacia: 'sacola' }[b.leva];
      this.spLeva.setVisible(!!(vista && leva)).setAlpha(alfa); if (vista && leva) this.spLeva.setTexture('det-' + leva).setPosition(wx + mao, wy - 10).setDepth(this.spPepper.depth + 0.01);
      const naMao = vista && !leva && b.celular === 'mao';
      this.spCel.setVisible(naMao).setAlpha(alfa); if (naMao) this.spCel.setPosition(wx + mao, wy - (sentada ? 5 : 9)).setDepth(this.spPepper.depth + (p.lado === 'costas' ? -0.01 : 0.01));
      const criado = b.celular === 'criado' && acha('criado-1', 'criado');
      this.spCelCriado.setVisible(!!(dela && criado)); if (dela && criado) { const [cx, cy] = iso(criado.x + 0.2, criado.y + 0.45, 12); this.spCelCriado.setPosition(cx, cy).setDepth(profundidade(criado) + 0.02); }
      const pr = b.prato && !(Number(b.prato.porcoes) <= 0) && acha(b.prato.onde || 'mesa-jantar', 'mesa_jantar');
      this.spPrato.setVisible(!!(dela && pr)); if (dela && pr) { const [mx, my] = iso(pr.x + 0.55, pr.y + 1.0, 15); this.spPrato.setPosition(mx, my).setDepth(profundidade(pr) + 0.02); }
      this.desenharTv(t, dela);
    }
    // A tela da TV ligada: uma cena genérica pelo tipo do programa (esporte, videogame, notícia, desenho, série), 4 quadros
    // por segundo, na face da tela (de 0,1 a 1,9 de largura e de 2 a 20 pixels de altura, como em arte.js).
    desenharTv(t, dela) {
      const g = this.tvTela; const tv = this.mapa.itens.find((i) => i.modelo === 'tv'); const e = this.tv || {};
      if (!dela || !tv || !e.ligada) { g.setVisible(false); this.tvTipo = null; return; }
      const tipo = tipoDePrograma(e.programa); this.tvTipo = tipo; if (g.visible && t - (this.tvEm || 0) < 250) return; this.tvEm = t;
      const P = (u, h) => { const [x, y] = iso(tv.x + u, tv.y + 0.3, (tv.z || 0) + h); return { x, y }; };
      const q = (u0, u1, h0, h1, cor) => { g.fillStyle(cor, 1); g.fillPoints([P(u0, h0), P(u1, h0), P(u1, h1), P(u0, h1)], true); };
      const k = Math.floor(t / 250); g.clear(); g.setVisible(true).setDepth(profundidade(tv) + 0.01);
      if (tipo === 'esporte') { q(0.12, 1.88, 2.5, 19.5, 0x3f8f4f); q(0.95, 1.0, 2.5, 19.5, 0x9fcf86); const u = 0.2 + ((k * 0.09) % 1.5); q(u, u + 0.09, 8, 10, 0xfff8ec); q(0.15, 0.7, 16.5, 19, 0x141018); }
      else if (tipo === 'videogame') { q(0.12, 1.88, 2.5, 19.5, 0x1f2440); [0xe0405a, 0xf6d76b, 0x6fa36b, 0x6b86c9].forEach((c, i) => q(0.2 + i * 0.42, 0.42 + i * 0.42, 2.5, 4 + ((k + i) % 4) * 2, c));
        const u = 0.25 + (k % 9) * 0.15; q(u, u + 0.14, 9 + (k % 2) * 2, 12 + (k % 2) * 2, 0xf6d76b); }
      else if (tipo === 'noticia') { q(0.12, 1.88, 2.5, 19.5, 0x3b4f8f); q(0.8, 1.2, 6, 15, 0xf2c3a0); q(0.75, 1.25, 6, 9, 0x2a2633); q(0.12, 1.88, 2.5, 6, 0xe0405a); q(0.15 + (k % 8) * 0.2, 0.3 + (k % 8) * 0.2, 3.5, 4.5, 0xfff8ec); }
      else { const cenas = tipo === 'desenho' ? [0x9fcf86, 0xe58a9b, 0xa9c4e8] : [0x6e2a3a, 0x2f6b55, 0x7a4a35, 0x3b4f8f]; q(0.12, 1.88, 2.5, 19.5, cenas[Math.floor(k / 12) % cenas.length]);
        const d = Math.sin(k / 3) * 0.1; q(0.45 + d, 0.75 + d, 3, 14, 0xf2c3a0); q(1.15 - d, 1.45 - d, 3, 13, 0xd9a27a); q(0.12, 1.88, 2.5, 4, 0x1a1424); }
    }
    // O Jean: anda pelo caminho tocado ou pela direção pedida; o aviso de ação aparece perto de um item com menu.
    viverJean(t, dt) {
      const j = this.jean; const visto = j.visivel && (j.andar || 0) === this.andar;
      if (visto && !j.preso && this.camera === 'jean') {
        const d = this.direcaoAgora();
        if (d) { j.caminho = []; j.depois = null; if (this.passoLivre(d[0], d[1], dt)) { j.t += dt; if (j.t > 140) { j.t = 0; j.quadro = (j.quadro + 1) % 4; } j.andando = true; } }
        else if (j.caminho.length) { this.andarPor(j, dt, 2.2); j.mexeuEm = t; j.t += dt; if (j.t > 140) { j.t = 0; j.quadro = (j.quadro + 1) % 4; } if (!j.caminho.length) this.jeanParou(); j.andando = true; }
        else j.andando = false;
      } else if (visto && j.caminho.length) { this.andarPor(j, dt, 2.2); j.andando = true; if (!j.caminho.length) this.jeanParou(); } else j.andando = false;
      const [x, y] = iso(j.x, j.y);
      // usando um item (J3 e o adendo 10, item 1): sentado, deitado (a cabeça no travesseiro) ou com as mãos na frente
      const ac = !j.andando && j.acao ? j.acao : null; const deitado = visto && ac && ac.pose === 'deitada';
      const pose = j.andando ? 'andando' + j.quadro : ac && ac.pose === 'sentada' ? 'sentada' : ac && ac.pose === 'usando' ? 'usando' : 'parada';
      this.spJean.setVisible(visto && !deitado).setPosition(x, y).setDepth(profundidadePessoa(j.x, j.y) + (pose === 'sentada' ? 0.6 : 0)).setTexture(`jean-${j.lado}-${pose}${j.esp ? '-esp' : ''}`);
      if (deitado) { const it = this.mapa.itens.find((i) => i.id === ac.item) || { x: j.x - 0.5, y: j.y - 0.5 }; const [hx, hy] = iso(it.x + 0.55, it.y + 0.55, 17);
        this.spJeanCabeca.setVisible(true).setPosition(hx, hy).setDepth(profundidade(it) + 0.01); } else this.spJeanCabeca.setVisible(false);
      // o aviso de ação: o item com menu mais perto, até 1,4 bloco
      let perto = null;
      if (visto && this.camera === 'jean' && !j.andando && !this.construindo) { let melhor = 1.4;
        for (const it of this.mapa.itens) { if (!temMenu(it)) continue; const d = Math.hypot(it.x + it.w / 2 - j.x, it.y + it.d / 2 - j.y) - Math.max(it.w, it.d) / 2; if (d < melhor) { melhor = d; perto = it.id; } } }
      if (perto !== this.perto || (perto && t - (this.pertoEm || 0) > 500)) { this.perto = perto; this.pertoEm = t; if (op.aoPerto) { const s = perto && this.sprites[perto]; const pt = s ? this.naTela(s.x, s.y - s.displayHeight * 0.8) : null; op.aoPerto(perto, pt && pt.x, pt && pt.y); } }
    }
    // O gato segue o que o servidor diz que ele faz (DEC-175): dorme, olha a janela, come, pede comida, sobe no notebook,
    // arranha, corre de madrugada, derruba coisas, ronrona. Só código.
    viverGato(t, dt) {
      const gt = this.gato; const P = this.mapa.pontos.gato; if (!gt.vivo || !P) { this.spGato.setVisible(false); this.spBalaoGato.setVisible(false); return; }
      if (t > gt.proxima && !gt.caminho.length) {
        const pp = this.pepper; const perto = { x: pp.x + 0.6, y: pp.y + 0.4 }; const um = (l) => (l && l.length ? l[Math.floor(Math.random() * l.length)] : null);
        const alvo = { dormindo: um(P.dormir), janela: um(P.janela), comendo: um(P.comer), pedindo_comida: um(P.comer), notebook: um(P.notebook), arranhando: um(P.arranhar),
          correndo: um(P.andar), brincando: um(P.andar), derrubando: { x: 3.4, y: 6.8 }, ronronando: pp.visivel ? perto : um(P.dormir) }[gt.acao] || um(P.dormir) || { x: gt.x, y: gt.y };
        gt.caminho = caminho(this.gGato, gt, alvo); gt.z = 0; gt.alvoZ = alvo.z || 0;
        gt.proxima = ['correndo', 'brincando'].includes(gt.acao) ? t + 1500 : t + 30000 + Math.random() * 60000;
      }
      const vel = gt.acao === 'correndo' ? 3.2 : 1.1;
      if (gt.caminho.length) { this.andarPor(gt, dt, vel); gt.t += dt; if (gt.t > (vel > 2 ? 90 : 180)) { gt.t = 0; gt.quadro = 1 - gt.quadro; } if (!gt.caminho.length) gt.z = gt.alvoZ || 0; }
      const dorme = !gt.caminho.length && ['dormindo', 'notebook', 'janela'].includes(gt.acao);
      const [x, y] = iso(gt.x, gt.y, gt.z);
      this.spGato.setVisible(true).setPosition(x, y).setDepth(profundidadePessoa(gt.x, gt.y) + (dorme ? 0.7 : 0) + (gt.z ? 0.4 : 0))
        .setTexture(`gato-${gt.caminho.length ? (gt.quadro ? 'andando1' : 'andando2') : dorme ? 'dormindo' : 'parado'}${!gt.caminho.length && this.vivo.ligada() ? this.vivo.rabo(t, dorme) : ''}${gt.esp ? '-esp' : ''}`);
      const b = gt.caminho.length ? null : { pedindo_comida: 'comida', ronronando: 'coracao', derrubando: 'susto' }[gt.acao];
      this.spBalaoGato.setVisible(!!b).setPosition(x + 6, y - 14 + Math.round(Math.sin(t / 400))); if (b) this.spBalaoGato.setTexture('balao-' + b);
    }
    // O que se mexe sem o servidor: as moscas na areia suja, a TV piscando, as notas do toca-discos, a chuva e a neve lá fora.
    vidaMiuda(t, dt) {
      const D = this.detalhe;
      D.moscas.forEach((m, k) => { if (m && m.visible && D.areia) m.setPosition(D.areia.x + Math.sin(t / 300 + k * 2) * 7, D.areia.y - 10 - Math.cos(t / 250 + k) * 4); });
      if (this.tvLuz) { const on = !!(this.tv || {}).ligada; this.tvLuz.setVisible(on); if (on) this.tvLuz.setTint([0x7fb6ff, 0xffd28c, 0x9fe8a0, 0xff9bd0][(Number(this.tv.canal) || 1) % 4]).setAlpha(0.25 + 0.12 * Math.sin(t / 90 + Math.sin(t / 37))); }
      const toca = this.sprites['toca-discos']; this.notas.forEach((n, k) => { if (!(this.toca || {}).tocando || !toca) { n.setVisible(false); return; } const f = ((t / 1600) + k / 3) % 1;
        n.setVisible(true).setPosition(toca.x + 6 + Math.sin(f * 6 + k) * 4, toca.y - 18 - f * 18).setAlpha(1 - f); });
      const cai = this.dela && (this.clima === 'chuva' || this.clima === 'neve'); const chave = this.clima === 'neve' ? 'det-floco' : 'det-gota';
      for (const g of this.gotas) {
        if (!cai) { g.s.setVisible(false); continue; }
        if (!g.ch) { const [x, y] = this.pontoFora(); g.ch = iso(x, y); g.t = Math.random(); g.s.setTexture(chave); }
        g.t += dt / (this.clima === 'neve' ? 2600 : 520); if (g.t >= 1) { g.ch = null; continue; }
        g.s.setVisible(true).setPosition(g.ch[0] + (this.clima === 'neve' ? Math.sin(t / 500 + g.ch[0]) * 3 : -g.t * 6), g.ch[1] - (1 - g.t) * 60);
      }
    }
  }
  const jogo = new Phaser.Game({ type: Phaser.AUTO, parent: pai, pixelArt: true, backgroundColor: '#1b1430', banner: false,
    scale: { mode: Phaser.Scale.RESIZE, width: pai.clientWidth || 390, height: pai.clientHeight || 844 },
    input: { activePointers: 2, keyboard: false }, scene: [Casa] });
  return {
    jogo,
    atualizar: (c) => { if (cena) cena.atualizar(c); else pendente = c; },
    olhar: (id) => { if (cena) { cena.fixo = id; cena.desvio.x = 0; cena.desvio.y = 0; } },
    mover: (id, tirar) => cena && cena.iniciarMover(id, tirar),
    posicao: (id) => { if (!cena) return null; const s = id === 'gato' ? cena.spGato : id === 'jean' ? cena.spJean : id === 'pepper' ? cena.spPepper : id === 'morgan' ? cena.spMorgan : cena.sprites[id]; return s ? cena.naTela(s.x, s.y - s.displayHeight * 0.4) : null; },
    girar: () => cena && cena.girarMover(),
    cancelarMover: () => cena && cena.cancelarMover(),
    estado: () => (cena ? cena.estado : null),
    zoom: (d) => cena && cena.mudarZoom(d),
    centralizar: () => cena && cena.centralizar(),
    verTudo: () => cena && cena.verTudo(),
    // DEC-176: a câmera, o Jean, os andares e o construtor
    camera: (modo) => { if (cena) { cena.camera = modo; cena.fixo = null; cena.livre = null; } },
    modoCamera: () => (cena ? cena.camera : 'pepper'),
    jean: () => (cena ? { ...cena.jean, caminho: undefined } : null),
    direcao: (dx, dy) => { if (cena) { const tinha = cena.dirExterna[0] || cena.dirExterna[1]; cena.dirExterna = [dx, dy]; if (tinha && !dx && !dy) cena.jeanParou(); } },
    andarAte: (x, y) => cena && cena.andarJeanAte(x, y),
    andarEFazer: (x, y, fn) => cena && cena.andarEFazer(x, y, fn),
    remontar: (mapa, andar) => cena && cena.remontar(mapa, andar),
    andarVisto: () => (cena ? cena.andar : 0),
    mapa: () => (cena ? cena.mapaTodo : op.mapa),
    construir: (modo) => { if (!cena) return; cena.construindo = modo || null; if (!modo) cena.livre = null; cena.marcar([]); },
    marcar: (formas) => cena && cena.marcar(formas),
    fantasma: (it, erro) => cena && cena.fantasmaConstrutor(it, erro),
    perto: () => (cena ? cena.perto : null),
    // Parado por baixo de um app que cobre a tela, ou sem o contexto do WebGL (rodada 9, parte I): o laço dorme e acorda.
    pausar: (on) => { if (!jogo.loop) return; if (on) jogo.loop.sleep(); else jogo.loop.wake(); },
    destruir: () => jogo.destroy(true),
  };
}
