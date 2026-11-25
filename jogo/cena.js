// Central — a cena do jogo (etapa 8, entrega 1): a casa da Pepper em isométrico, a luz, ela vivendo sozinha, o gato e a
// câmera. O servidor é a verdade (DEC-162): a cena só desenha o que o workflow 68 manda (a atividade, o objeto, as luzes)
// e anima no aparelho, sem IA. Phaser 4 (global `Phaser`, carregado pelo app/jogo.js).
import * as A from './arte.js';

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
export function grade(mapa, livres = []) {
  const N = 2, W = mapa.largura * N, H = mapa.fundo * N;
  const bloqueado = new Uint8Array(W * H);
  for (const it of mapa.itens) {
    if (it.chao || it.solto || it.parede || livres.includes(it.id)) continue;
    for (let cy = Math.floor((it.y + 0.05) * N); cy < Math.ceil((it.y + it.d - 0.05) * N); cy++)
      for (let cx = Math.floor((it.x + 0.05) * N); cx < Math.ceil((it.x + it.w - 0.05) * N); cx++) if (cx >= 0 && cy >= 0 && cx < W && cy < H) bloqueado[cy * W + cx] = 1;
  }
  // As paredes viram arestas que não se cruzam, menos nas aberturas (porta e vão).
  const aberto = (lado, x, y) => mapa.aberturas.some((a) => a.tipo !== 'janela' && ((lado === 'v' && a.lado === 'w' && a.em[0] === x && y >= a.em[1] && y < a.em[1] + a.largura)
    || (lado === 'h' && a.lado === 'n' && a.em[1] === y && x >= a.em[0] && x < a.em[0] + a.largura)));
  const parede = (lado, x, y) => !aberto(lado, Math.floor(x), Math.floor(y)) && mapa.paredes.some((p) => (lado === 'v' ? p.de[0] === p.para[0] && p.de[0] === x && y >= p.de[1] && y < p.para[1]
    : p.de[1] === p.para[1] && p.de[1] === y && x >= p.de[0] && x < p.para[0]));
  const pode = (ax, ay, bx, by) => {
    if (bx < 0 || by < 0 || bx >= W || by >= H || bloqueado[by * W + bx]) return false;
    if (ax !== bx) { const lx = Math.max(ax, bx) / N; if (Number.isInteger(lx) && parede('v', lx, ay / N)) return false; }
    if (ay !== by) { const ly = Math.max(ay, by) / N; if (Number.isInteger(ly) && parede('h', ax / N, ly)) return false; }
    return true;
  };
  return { N, W, H, bloqueado, pode };
}
// Busca em largura do ponto (x, y) ao alvo, em blocos; devolve a lista de pontos (centros de célula) ou [] se não chega.
export function caminho(g, de, para) {
  const c = (p) => [Math.min(g.W - 1, Math.max(0, Math.floor(p.x * g.N))), Math.min(g.H - 1, Math.max(0, Math.floor(p.y * g.N)))];
  const [sx, sy] = c(de), [tx, ty] = c(para);
  const veio = new Int32Array(g.W * g.H).fill(-1); const fila = [sy * g.W + sx]; veio[fila[0]] = fila[0];
  while (fila.length) {
    const k = fila.shift(); const x = k % g.W, y = (k - x) / g.W;
    if (x === tx && y === ty) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, n = ny * g.W + nx;
      if (nx < 0 || ny < 0 || nx >= g.W || ny >= g.H || veio[n] >= 0) continue;
      if (!g.pode(x, y, nx, ny) && !(nx === tx && ny === ty && !g.bloqueado[n])) continue;
      veio[n] = k; fila.push(n);
    }
  }
  const fim = ty * g.W + tx; if (veio[fim] < 0) return [];
  const pts = []; for (let k = fim; k !== veio[k]; k = veio[k]) pts.unshift({ x: (k % g.W + 0.5) / g.N, y: (Math.floor(k / g.W) + 0.5) / g.N });
  pts.push({ x: para.x, y: para.y }); return pts;
}

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
const corNum = (c) => parseInt(String(c || '#ffffff').replace('#', ''), 16);

// ---------------------------------------------------------------- a cena
export function criarJogo(Phaser, pai, { mapa, aoDiagnostico, aoTocar, aoSoltar }) {
  let cena = null; let pendente = null;
  class Casa extends Phaser.Scene {
    constructor() { super('casa'); }
    create() {
      cena = this; this.mapa = mapa; this.estados = {}; this.diag = { luzes: 0, total: 0 };
      this.cameras.main.setBackgroundColor('#1b1430');
      this.registrarArte(); this.montar(); this.montarLuz(); this.montarPessoas(); this.montarCamera();
      this.time.addEvent({ delay: 30000, loop: true, callback: () => this.redesenharLuz() });
      if (pendente) { this.atualizar(pendente); pendente = null; }
    }
    textura(chave, pincel) { if (!this.textures.exists(chave)) this.textures.addCanvas(chave, pincel.pronto ? pincel.pronto() : pincel); }
    registrarArte() {
      for (const t of ['madeira', 'terracota', 'carpete', 'azulejo', 'calcada', 'asfalto', 'asfalto_faixa', 'tijolo']) this.textura('piso-' + t, A.piso(t));
      for (const lado of ['n', 'w']) for (const alt of [['alta', 48], ['baixa', 10]]) for (const tipo of ['parede', 'janela', 'porta']) for (const cor of ['rosado', 'azulejo'])
        if (!(alt[0] === 'baixa' && tipo === 'janela')) { const p = A.parede(lado, alt[1], tipo, cor); this.textura(`parede-${lado}-${alt[0]}-${tipo}-${cor}`, p); this.ancoras = this.ancoras || {}; this.ancoras[`parede-${lado}-${alt[0]}-${tipo}-${cor}`] = p.ancora; }
      this.ancoras = this.ancoras || {};
      for (const it of this.mapa.itens) this.texturaItem(it);
      for (const [k, p] of Object.entries(A.detalhes())) this.textura('det-' + k, p);
      for (const [k, p] of Object.entries(A.personagens())) this.textura(k, p);
      this.textura('halo', A.halo(64)); this.textura('feixe', A.feixe(96, 64));
    }
    texturaItem(it) { const k = 'item-' + it.id; if (this.textures.exists(k) && this.ancoras[k]) return; const p = A.item(it); if (!p) return; this.textura(k, p); this.ancoras[k] = p.ancora; }
    // Os itens do mapa (de novo a cada versão nova do mapa: o modo mover, DEC-175). O espelhado troca a pegada e vira o desenho.
    montarItens() {
      for (const s of Object.values(this.sprites || {})) s.destroy();
      this.sprites = {};
      for (const it of this.mapa.itens) {
        this.texturaItem(it); const k = 'item-' + it.id; if (!this.textures.exists(k)) continue;
        const [wx, wy] = iso(it.x, it.y, it.z || 0); const [ax, ay] = this.ancoras[k];
        this.sprites[it.id] = this.add.image(wx, wy, k).setOrigin(it.espelhado ? 1 - ax : ax, ay).setFlipX(!!it.espelhado).setDepth(profundidade(it));
      }
      const pe = (id, dx, dy, z, chave, extra = 0) => { const it = this.mapa.itens.find((i) => i.id === id); if (!it) return null; const [wx, wy] = iso(it.x + dx, it.y + dy, z);
        return this.add.image(wx, wy, 'det-' + chave).setOrigin(0.5, 1).setDepth(profundidade(it) + 0.05 + extra).setVisible(false); };
      for (const s of Object.values(this.detalhe || {})) (Array.isArray(s) ? s : [s]).forEach((x) => x && x.destroy());
      this.detalhe = { louca: pe('pia', 0.6, 0.5, 16, 'louca'), lixo: pe('lixeira', 0.25, 0.45, 2, 'lixo', 0.1), roupa: pe('cesto-roupa', 0.3, 0.3, 9, 'roupa'), lencol: pe('cama', 1.0, 1.1, 16, 'lencol'),
        areia: pe('caixa-areia', 0.5, 0.5, 5, 'areia_suja'), mancha: pe('caixa-areia', 1.3, 0.5, 0, 'mancha', -0.3), racao: pe('potes-gato', 0.18, 0.2, 3, 'racao'),
        moscas: [0, 1, 2].map(() => pe('caixa-areia', 0.5, 0.5, 14, 'mosca', 0.2)) };
      const tv = this.mapa.itens.find((i) => i.modelo === 'tv'); this.tvLuz && this.tvLuz.destroy();
      this.tvLuz = tv ? this.add.image(...iso(tv.x + tv.w / 2, tv.y + 0.8, 12), 'halo').setBlendMode(Phaser.BlendModes.ADD).setDepth(1001).setScale(1.2, 0.8).setVisible(false) : null;
      this.g = grade(this.mapa);
    }
    montar() {
      const m = this.mapa;
      // fora da casa nunca fica vazio (aparelhos.md): a calçada em volta, a rua na frente e do lado, o pátio de tijolo atrás
      const chao = [];
      const ex = m.exterior; if (ex) for (let y = ex.area[1]; y < ex.area[3]; y++) for (let x = ex.area[0]; x < ex.area[2]; x++) {
        if (x >= 0 && y >= 0 && x < m.largura && y < m.fundo) continue;
        const dx = x < 0 ? -x : x >= m.largura ? x - m.largura + 1 : 0, dy = y < 0 ? -y : y >= m.fundo ? y - m.fundo + 1 : 0;
        const frente = y >= m.fundo || x >= m.largura; const d = Math.max(dx, dy);
        const t = !frente ? (d <= ex.calcada ? 'calcada' : ex.fundo) : d <= ex.calcada ? 'calcada' : d <= ex.calcada + ex.rua ? ((d === ex.calcada + Math.ceil(ex.rua / 2)) && (x + y) % 3 ? 'asfalto_faixa' : 'asfalto') : 'calcada';
        chao.push([x, y, t]);
      }
      // o chão
      for (const c of m.comodos) for (let y = c.area[1]; y < c.area[3]; y++) for (let x = c.area[0]; x < c.area[2]; x++) {
        if (m.comodos.some((o) => o !== c && o.area[0] <= x && x < o.area[2] && o.area[1] <= y && y < o.area[3] && (o.area[2] - o.area[0]) * (o.area[3] - o.area[1]) < (c.area[2] - c.area[0]) * (c.area[3] - c.area[1]))) continue;
        chao.push([x, y, c.piso]);
      }
      // Todo o chão numa textura só, desenhada uma vez (o desempenho no celular, DEC-173): o de fora primeiro, o de dentro por cima.
      const ae = m.exterior ? m.exterior.area : [0, 0, m.largura, m.fundo];
      const cx = [], cy = []; for (const [x, y] of [[ae[0], ae[1]], [ae[2], ae[1]], [ae[0], ae[3]], [ae[2], ae[3]]]) { const [a, b] = iso(x, y); cx.push(a); cy.push(b); }
      const x0 = Math.min(...cx) - 20, y0 = Math.min(...cy) - 4, rt = this.add.renderTexture(x0, y0, Math.max(...cx) - x0 + 20, Math.max(...cy) - y0 + 20).setOrigin(0, 0).setDepth(-100);
      for (const [x, y, t] of chao) { const [wx, wy] = iso(x, y); rt.stamp('piso-' + t, null, wx - x0 - 17, wy - y0 - 1, { originX: 0, originY: 0 }); }
      rt.render();
      // as paredes, bloco a bloco, com as janelas e as portas
      for (const pa of m.paredes) {
        const lado = pa.de[1] === pa.para[1] ? 'n' : 'w'; const n = lado === 'n' ? pa.para[0] - pa.de[0] : pa.para[1] - pa.de[1];
        for (let k = 0; k < n; k++) {
          const x = lado === 'n' ? pa.de[0] + k : pa.de[0], y = lado === 'n' ? pa.de[1] : pa.de[1] + k;
          const ab = m.aberturas.find((a) => a.lado === lado && (lado === 'n' ? a.em[1] === y && x >= a.em[0] && x < a.em[0] + a.largura : a.em[0] === x && y >= a.em[1] && y < a.em[1] + a.largura));
          if (ab && ab.tipo === 'vao') continue;
          if (ab && ab.tipo === 'porta' && pa.altura === 'baixa' && !ab.privada) continue;
          const tipo = ab ? ab.tipo : 'parede'; const chave = `parede-${lado}-${pa.altura}-${tipo}-${pa.cor === 'azulejo' ? 'azulejo' : 'rosado'}`;
          const px = lado === 'n' ? x : x - 0.25, py = lado === 'n' ? y - 0.25 : y;
          const [wx, wy] = iso(px, py);
          const fundo = pa.altura === 'alta';
          const s = this.add.image(wx, wy, chave).setOrigin(...this.ancoras[chave]);
          s.setDepth(fundo ? -60 + (x + y) * 0.01 : (lado === 'n' ? x + 0.5 + y : x + y + 0.5) - 0.02);
          if (ab && ab.tipo === 'porta' && ab.privada) this.portaBanheiro = { wx, wy: wy - 30, x, y };
        }
      }
      this.montarItens();
      const xs = [], ys = [];
      const ar = m.exterior ? m.exterior.area : [0, 0, m.largura, m.fundo];
      for (const [x, y] of [[ar[0], ar[1]], [ar[2], ar[1]], [ar[0], ar[3]], [ar[2], ar[3]]]) { const [a, b] = iso(x, y); xs.push(a); ys.push(b); }
      this.limites = { x0: Math.min(...xs) - 40, x1: Math.max(...xs) + 40, y0: Math.min(...ys) - 80, y1: Math.max(...ys) + 40 };
      // a chuva e a neve, só do lado de fora (o clima real de NY, DEC-175)
      this.gotas = [];
      if (m.exterior) for (let k = 0; k < 70; k++) this.gotas.push({ s: this.add.image(0, 0, 'det-gota').setDepth(999).setVisible(false), t: Math.random() });
      this.notas = [0, 1, 2].map(() => this.add.image(0, 0, 'det-nota').setDepth(1003).setVisible(false));
    }
    // Um ponto do chão fora da casa, ao acaso, para a gota cair.
    pontoFora() { const m = this.mapa, a = m.exterior.area; for (;;) { const x = a[0] + Math.random() * (a[2] - a[0]), y = a[1] + Math.random() * (a[3] - a[1]); if (x < -0.3 || y < -0.3 || x > m.largura + 0.3 || y > m.fundo + 0.3) return [x, y]; } }
    montarLuz() {
      const L = this.limites; this.escuro = this.add.renderTexture(L.x0, L.y0, L.x1 - L.x0, L.y1 - L.y0).setOrigin(0, 0).setDepth(1000);
      this.borracha = this.make.image({ key: 'halo', add: false });
      this.montarLuzes();
      this.janelas = this.mapa.aberturas.filter((a) => a.tipo === 'janela').map((a) => {
        const [wx, wy] = a.lado === 'n' ? iso(a.em[0] + a.largura / 2, a.em[1] + 1.4) : iso(a.em[0] + 1.4, a.em[1] + a.largura / 2);
        const s = this.add.image(wx, wy - 20, 'feixe').setBlendMode(Phaser.BlendModes.ADD).setDepth(1002).setTint(0xffc983).setAlpha(0);
        s.setAngle(a.lado === 'n' ? -28 : 28).setScale(1.1, 1.2); return { a, s, wx, wy };
      });
    }
    montarLuzes() {
      const antes = Object.fromEntries((this.luzes || []).map((l) => { l.brilhoSprite.destroy(); return [l.id, l]; }));
      this.luzes = this.mapa.itens.filter((it) => it.luz).map((it) => { const [wx, wy] = iso(it.x + it.w / 2, it.y + it.d / 2, (it.z || 0) + (it.luz.altura || 18));
        const v = antes[it.id] || {};
        return { id: it.id, wx, wy, raio: it.luz.raio, cor: v.cor || it.luz.cor, ligada: !!v.ligada, brilho: v.brilho ?? 100, brilhoSprite: this.add.image(wx, wy, 'halo').setBlendMode(Phaser.BlendModes.ADD).setDepth(1001).setVisible(false) }; });
    }
    redesenharLuz() {
      const h = horaNY(new Date()); const e = escuridao(h); const cam = this.cameras.main;
      const ativas = luzesAtivas(this.luzes, cam.midPoint.x, cam.midPoint.y);
      this.diag.luzes = ativas.length; this.diag.total = this.luzes.filter((l) => l.ligada).length;
      const L = this.limites; this.escuro.clear(); this.escuro.fill(0x1b1430, e);
      for (const l of ativas) { this.borracha.setScale(l.raio * 2 / 64).setAlpha(Math.min(1, 0.55 + l.brilho / 200)); this.escuro.erase(this.borracha, l.wx - L.x0, l.wy - L.y0); }
      const nub = this.clima === 'chuva' || this.clima === 'neve' ? 0.25 : this.clima === 'nublado' ? 0.5 : 1;
      for (const j of this.janelas) j.s.setAlpha(sol(j.a.lado, h) * (1 - e) * 0.55 * nub);
      this.escuro.render();
      for (const l of this.luzes) { const on = ativas.some((a) => a.id === l.id); l.brilhoSprite.setVisible(on && e > 0.15).setTint(corNum(l.cor)).setScale(l.raio * 0.9 / 64).setAlpha(0.12 + 0.16 * l.brilho / 100); }
      this.horaAtual = h;
    }
    montarPessoas() {
      const p0 = this.mapa.pontos.porta;
      this.pepper = { x: p0.x, y: p0.y, caminho: [], lado: 'frente', esp: false, pose: 'parada', quadro: 0, t: 0, visivel: false, alvo: null };
      this.spPepper = this.add.image(0, 0, 'pepper-frente-parada').setOrigin(9 / 18, 32 / 34).setVisible(false);
      this.spCabeca = this.add.image(0, 0, 'pepper-dormindo').setOrigin(0.5, 1).setVisible(false);
      this.spBalao = this.add.image(0, 0, 'balao-livro').setOrigin(0.5, 1).setDepth(1003).setVisible(false);
      this.spPorta = this.add.image(0, 0, 'balao-porta').setOrigin(0.5, 1).setDepth(1003).setVisible(false);
      const gp = this.mapa.pontos.gato.dormir[0];
      this.gato = { x: gp.x, y: gp.y, z: 0, caminho: [], esp: false, dormindo: true, quadro: 0, t: 0, acao: 'dormindo', proxima: 0, vivo: true };
      this.spGato = this.add.image(0, 0, 'gato-dormindo').setOrigin(0.5, 0.9);
      this.spBalaoGato = this.add.image(0, 0, 'balao-coracao').setOrigin(0.5, 1).setDepth(1003).setVisible(false);
      this.gGato = grade(this.mapa, ['caminha-gato', 'sofa', 'cama', 'tapete-sala']);
    }
    montarCamera() {
      const cam = this.cameras.main; this.desvio = { x: 0, y: 0 }; this.arrastando = null;
      this.input.on('pointerdown', (p) => { this.fixo = null; this.arrastando = { x: p.x, y: p.y, dx: this.desvio.x, dy: this.desvio.y, t: this.time.now }; });
      this.input.on('pointerup', (p) => { const a = this.arrastando; if (a && Math.hypot(p.x - a.x, p.y - a.y) < 10 && this.time.now - a.t < 600) this.tocou(p); });
      this.input.on('pointermove', (p) => { if (this.movendo) this.moverFantasma(p); if (!this.arrastando || !p.isDown || this.movendo) return; const z = cam.zoom;
        this.desvio.x = Math.max(-420, Math.min(420, this.arrastando.dx - (p.x - this.arrastando.x) / z)); this.desvio.y = Math.max(-260, Math.min(260, this.arrastando.dy - (p.y - this.arrastando.y) / z)); });
      this.input.on('pointerup', () => { this.arrastando = null; this.soltouEm = this.time.now; });
      this.ajustarEscala(); this.scale.on('resize', () => this.ajustarEscala());
      const [x, y] = iso(this.mapa.pontos.porta.x, this.mapa.pontos.porta.y); cam.centerOn(x, y);
    }
    // O toque: o item de cima (pelo pixel), ou o gato; no modo mover, onde soltar (DEC-175).
    tocou(p) {
      const w = this.cameras.main.getWorldPoint(p.x, p.y);
      if (this.movendo) { const [x, y] = this.chaoEm(w.x, w.y); if (aoSoltar) aoSoltar(this.movendo.id, x, y, !!this.movendo.espelhar, this.movendo.tirar); return; }
      // O pixel do item manda; sem pixel embaixo do dedo, vale o item menor cuja caixa contém o toque (item pequeno, layout).
      const cand = [], perto = [];
      const testa = (id, s) => { if (!s || !s.visible) return; const b = s.getBounds(); if (!b.contains(w.x, w.y)) return;
        let lx = Math.floor((w.x - b.x)), ly = Math.floor((w.y - b.y)); if (s.flipX) lx = s.width - 1 - lx; const a = this.textures.getPixelAlpha(lx, ly, s.texture.key);
        if (a > 0) cand.push({ id, d: s.depth }); else perto.push({ id, d: -b.width * b.height }); };
      for (const [id, s] of Object.entries(this.sprites)) { const it = this.mapa.itens.find((i) => i.id === id); if (it && !it.fora) testa(id, s); }
      if (this.gato.vivo) testa('gato', this.spGato);
      cand.sort((a, b) => b.d - a.d); if (!cand.length) cand.push(...perto.sort((a, b) => b.d - a.d));
      if (cand.length && aoTocar) { const id = cand[0].id; const s = id === 'gato' ? this.spGato : this.sprites[id]; const pt = this.naTela(s.x, s.y - s.displayHeight * 0.6); aoTocar(id, pt.x, pt.y); }
    }
    naTela(wx, wy) { const c = this.cameras.main; return { x: (wx - c.worldView.x) * c.zoom, y: (wy - c.worldView.y) * c.zoom }; }
    chaoEm(wx, wy) { const x = (wy / BY + wx / BX) / 2, y = (wy / BY - wx / BX) / 2; return [Math.round(x * 4) / 4, Math.round(y * 4) / 4]; }
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
    cancelarMover() { if (this.fantasma) this.fantasma.destroy(); this.fantasma = null; if (this.movendo && this.sprites[this.movendo.id]) this.sprites[this.movendo.id].setAlpha(1); this.movendo = null; }
    // A escala inteira (DEC-173): celular, pelo menos 180 pixels do jogo na menor dimensão; tablet, 300.
    ajustarEscala(forcar) {
      const w = this.scale.width, h = this.scale.height, menor = Math.min(w, h);
      const auto = menor < 600 ? (menor < 330 ? 2 : 3) : menor >= 1100 ? 5 : 4;
      this.escala = forcar || this.escalaManual || auto; this.cameras.main.setZoom(this.escala).setRoundPixels(true);
    }
    // O que o servidor mandou (o 68): as luzes e o que ela faz.
    atualizar(c) {
      this.estado = c;
      if (c.mapa && c.mapa.versao !== this.mapa.versao) { this.mapa = c.mapa; this.cancelarMover(); this.montarItens(); this.montarLuzes(); }
      const it = c.itens || {}, ca = c.casa || {}, D = this.detalhe;
      const vis = (s, v) => s && s.setVisible(!!v);
      vis(D.louca, ca.louca > 0); vis(D.lixo, ca.lixo >= 60); vis(D.roupa, ca.roupa > 0); vis(D.lencol, ca.arrumada === false && (c.pepper || {}).pose !== 'deitada');
      const areia = it['caixa-areia'] || {}; vis(D.areia, areia.sujeira >= 40); vis(D.mancha, areia.fora); D.moscas.forEach((m) => vis(m, areia.sujeira >= 60 || areia.fora));
      vis(D.racao, (it['potes-gato'] || {}).racao > 0);
      this.tv = it.tv || {}; this.toca = it['toca-discos'] || {}; this.clima = c.clima || 'sol';
      if (c.reacao) this.pepper.balaoTemp = { tipo: c.reacao === 'assombracao' ? 'susto' : 'pergunta', ate: this.time.now + 20000 };
      const gs = c.gato; this.gato.vivo = !!gs; this.spGato.setVisible(!!gs); if (gs && gs.acao !== this.gato.acao) { this.gato.acao = gs.acao; this.gato.proxima = 0; }
      for (const l of this.luzes) { const e = (c.itens || {})[l.id] || {}; l.ligada = e.ligada === true; l.brilho = Number.isFinite(e.brilho) ? e.brilho : 100; if (e.cor) l.cor = e.cor; }
      this.redesenharLuz();
      const pp = c.pepper || {}; const m = this.mapa;
      let destino = null, pose = 'parada', dir = 'se';
      if (pp.fora) destino = { ...m.pontos.porta, sumir: true };
      else if (pp.privado) destino = { ...m.pontos.banheiro || { x: 10.6, y: 8.5 }, sumir: true, privado: true };
      else { const it = m.itens.find((i) => i.id === pp.objeto) || m.itens.find((i) => i.id === 'sofa'); const u = (it.uso || [])[0] || { x: it.x + it.w / 2, y: it.y + it.d + 0.3 };
        destino = { x: u.x, y: u.y, item: it.id }; pose = u.pose || pp.pose || 'parada'; dir = u.dir || 'se'; }
      const p = this.pepper; p.balao = pp.balao || null; p.privado = false;
      if (!p.visivel && !pp.fora) { p.x = m.pontos.porta.x; p.y = m.pontos.porta.y; p.visivel = true; }
      if (p.alvo && p.alvo.x === destino.x && p.alvo.y === destino.y) return;
      p.alvo = destino; p.poseFinal = pose; p.dirFinal = dir; p.pose = 'andando';
      const g = grade(m, destino.item ? [destino.item] : []);
      p.caminho = caminho(g, p, destino); if (!p.caminho.length) { p.x = destino.x; p.y = destino.y; this.chegou(); }
    }
    chegou() { const p = this.pepper; p.pose = p.poseFinal; p.caminho = []; if (p.alvo.sumir) { p.visivel = false; p.privado = !!p.alvo.privado; }
      const d = p.dirFinal; p.lado = d === 'ne' || d === 'nw' ? 'costas' : 'frente'; p.esp = d === 'sw' || d === 'nw'; }
    andar(o, dt, vel) {
      const alvo = o.caminho[0]; if (!alvo) return false;
      const dx = alvo.x - o.x, dy = alvo.y - o.y, dist = Math.hypot(dx, dy), passo = vel * dt / 1000;
      if (Math.abs(dx) > Math.abs(dy)) { o.lado = dx > 0 ? 'frente' : 'costas'; o.esp = dx < 0; } else if (dy !== 0) { o.lado = dy > 0 ? 'frente' : 'costas'; o.esp = dy > 0; }
      if (dist <= passo) { o.x = alvo.x; o.y = alvo.y; o.caminho.shift(); } else { o.x += dx / dist * passo; o.y += dy / dist * passo; }
      return true;
    }
    update(t, dt) {
      const p = this.pepper; const cam = this.cameras.main;
      if (p.caminho.length) { this.andar(p, dt, 1.6); p.t += dt; if (p.t > 140) { p.t = 0; p.quadro = (p.quadro + 1) % 4; } if (!p.caminho.length) this.chegou(); }
      const deitada = p.pose === 'deitada' && !p.caminho.length;
      const [wx, wy] = iso(p.x, p.y);
      this.spPepper.setVisible(p.visivel && !deitada).setPosition(wx, wy).setDepth(profundidadePessoa(p.x, p.y) + (p.pose === 'sentada' ? 0.6 : 0))
        .setTexture(`pepper-${p.lado}-${p.caminho.length ? 'andando' + p.quadro : p.pose === 'sentada' ? 'sentada' : 'parada'}${p.esp ? '-esp' : ''}`);
      if (deitada) { const cama = this.mapa.itens.find((i) => i.id === p.alvo.item) || { x: p.x, y: p.y, w: 1 }; const [hx, hy] = iso(cama.x + 0.55, cama.y + 0.55, 17);
        this.spCabeca.setVisible(true).setPosition(hx, hy).setDepth(profundidade(cama) + 0.01); } else this.spCabeca.setVisible(false);
      const topo = deitada ? [this.spCabeca.x, this.spCabeca.y - 10] : [wx, wy - 34];
      const temp = p.balaoTemp && p.balaoTemp.ate > t ? p.balaoTemp.tipo : null;
      const bal = p.caminho.length ? null : temp || (deitada ? 'zzz' : p.balao);
      this.spBalao.setVisible(p.visivel && !!bal).setPosition(topo[0] + 4, topo[1] + Math.round(Math.sin(t / 500))); if (bal) this.spBalao.setTexture('balao-' + bal);
      this.spPorta.setVisible(!!p.privado && !!this.portaBanheiro); if (this.portaBanheiro) this.spPorta.setPosition(this.portaBanheiro.wx, this.portaBanheiro.wy);
      this.viverGato(t, dt); this.vidaMiuda(t, dt);
      // a câmera: segue a Pepper suavemente; o desvio do dedo volta sozinho
      if (!this.arrastando && t - (this.soltouEm || 0) > 2000) { this.desvio.x *= 0.95; this.desvio.y *= 0.95; }
      const fixo = this.fixo === 'gato' ? this.spGato : this.fixo && this.sprites[this.fixo]; const foco = fixo ? [fixo.x, fixo.y - 16] : p.visivel ? [wx, wy - 16] : iso(this.mapa.pontos.fora.x, this.mapa.pontos.fora.y);
      cam.scrollX += ((foco[0] + this.desvio.x - cam.width / 2) - cam.scrollX) * 0.08;
      cam.scrollY += ((foco[1] + this.desvio.y - cam.height / 2) - cam.scrollY) * 0.08;
      if (aoDiagnostico) aoDiagnostico({ fps: this.game.loop.actualFps, luzes: this.diag.luzes, total: this.diag.total, escala: this.escala, w: Math.round(this.scale.width / this.escala), h: Math.round(this.scale.height / this.escala),
        renderer: this.game.renderer.type === Phaser.WEBGL ? 'WebGL' : 'Canvas' });
    }
    // O gato segue o que o servidor diz que ele faz (DEC-175): dorme, olha a janela, come, pede comida, sobe no notebook,
    // arranha, corre de madrugada, derruba coisas, ronrona. Só código.
    viverGato(t, dt) {
      const gt = this.gato; const P = this.mapa.pontos.gato; if (!gt.vivo) { this.spBalaoGato.setVisible(false); return; }
      if (t > gt.proxima && !gt.caminho.length) {
        const pp = this.pepper; const perto = { x: pp.x + 0.6, y: pp.y + 0.4 }; const um = (l) => (l && l.length ? l[Math.floor(Math.random() * l.length)] : null);
        const alvo = { dormindo: um(P.dormir), janela: um(P.janela), comendo: um(P.comer), pedindo_comida: um(P.comer), notebook: um(P.notebook), arranhando: um(P.arranhar),
          correndo: um(P.andar), brincando: um(P.andar), derrubando: { x: 3.4, y: 6.8 }, ronronando: pp.visivel ? perto : um(P.dormir) }[gt.acao] || um(P.dormir);
        gt.caminho = caminho(this.gGato, gt, alvo); gt.z = 0; gt.alvoZ = alvo.z || 0;
        gt.proxima = ['correndo', 'brincando'].includes(gt.acao) ? t + 1500 : t + 30000 + Math.random() * 60000;
      }
      const vel = gt.acao === 'correndo' ? 3.2 : 1.1;
      if (gt.caminho.length) { this.andar(gt, dt, vel); gt.t += dt; if (gt.t > (vel > 2 ? 90 : 180)) { gt.t = 0; gt.quadro = 1 - gt.quadro; } if (!gt.caminho.length) gt.z = gt.alvoZ || 0; }
      const dorme = !gt.caminho.length && ['dormindo', 'notebook', 'janela'].includes(gt.acao);
      const [x, y] = iso(gt.x, gt.y, gt.z);
      this.spGato.setPosition(x, y).setDepth(profundidadePessoa(gt.x, gt.y) + (dorme ? 0.7 : 0) + (gt.z ? 0.4 : 0))
        .setTexture(`gato-${gt.caminho.length ? (gt.quadro ? 'andando1' : 'andando2') : dorme ? 'dormindo' : 'parado'}${gt.esp ? '-esp' : ''}`);
      const b = gt.caminho.length ? null : { pedindo_comida: 'comida', ronronando: 'coracao', derrubando: 'susto' }[gt.acao];
      this.spBalaoGato.setVisible(!!b).setPosition(x + 6, y - 14 + Math.round(Math.sin(t / 400))); if (b) this.spBalaoGato.setTexture('balao-' + b);
    }
    // O que se mexe sem o servidor: as moscas na areia suja, a TV piscando, as notas do toca-discos, a chuva e a neve lá fora.
    vidaMiuda(t, dt) {
      const D = this.detalhe;
      D.moscas.forEach((m, k) => { if (m && m.visible) m.setPosition(D.areia.x + Math.sin(t / 300 + k * 2) * 7, D.areia.y - 10 - Math.cos(t / 250 + k) * 4); });
      if (this.tvLuz) { const on = !!this.tv.ligada; this.tvLuz.setVisible(on); if (on) this.tvLuz.setTint([0x7fb6ff, 0xffd28c, 0x9fe8a0, 0xff9bd0][(Number(this.tv.canal) || 1) % 4]).setAlpha(0.25 + 0.12 * Math.sin(t / 90 + Math.sin(t / 37))); }
      const toca = this.sprites['toca-discos']; this.notas.forEach((n, k) => { if (!this.toca.tocando || !toca) { n.setVisible(false); return; } const f = ((t / 1600) + k / 3) % 1;
        n.setVisible(true).setPosition(toca.x + 6 + Math.sin(f * 6 + k) * 4, toca.y - 18 - f * 18).setAlpha(1 - f); });
      const cai = this.clima === 'chuva' || this.clima === 'neve'; const chave = this.clima === 'neve' ? 'det-floco' : 'det-gota';
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
    input: { activePointers: 2 }, scene: [Casa] });
  return {
    jogo,
    atualizar: (c) => { if (cena) cena.atualizar(c); else pendente = c; },
    olhar: (id) => { if (cena) { cena.fixo = id; cena.desvio.x = 0; cena.desvio.y = 0; } },
    mover: (id, tirar) => cena && cena.iniciarMover(id, tirar),
    posicao: (id) => { if (!cena) return null; const s = id === 'gato' ? cena.spGato : cena.sprites[id]; return s ? cena.naTela(s.x, s.y - s.displayHeight * 0.4) : null; },
    girar: () => cena && cena.girarMover(),
    cancelarMover: () => cena && cena.cancelarMover(),
    estado: () => (cena ? cena.estado : null),
    zoom: (d) => { if (!cena) return; cena.escalaManual = Math.max(1, Math.min(5, (cena.escala || 2) + d)); cena.ajustarEscala(); },
    destruir: () => jogo.destroy(true),
  };
}
