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
export function criarJogo(Phaser, pai, { mapa, aoDiagnostico }) {
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
      for (const it of this.mapa.itens) { const p = A.item(it); if (!p) continue; this.textura('item-' + it.id, p); this.ancoras['item-' + it.id] = p.ancora; }
      for (const [k, p] of Object.entries(A.personagens())) this.textura(k, p);
      this.textura('halo', A.halo(64)); this.textura('feixe', A.feixe(96, 64));
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
      // os itens
      this.sprites = {};
      for (const it of m.itens) {
        if (!this.textures.exists('item-' + it.id)) continue;
        const [wx, wy] = iso(it.x, it.y, it.z || 0);
        this.sprites[it.id] = this.add.image(wx, wy, 'item-' + it.id).setOrigin(...this.ancoras['item-' + it.id]).setDepth(profundidade(it));
      }
      const xs = [], ys = [];
      const ar = m.exterior ? m.exterior.area : [0, 0, m.largura, m.fundo];
      for (const [x, y] of [[ar[0], ar[1]], [ar[2], ar[1]], [ar[0], ar[3]], [ar[2], ar[3]]]) { const [a, b] = iso(x, y); xs.push(a); ys.push(b); }
      this.limites = { x0: Math.min(...xs) - 40, x1: Math.max(...xs) + 40, y0: Math.min(...ys) - 80, y1: Math.max(...ys) + 40 };
      this.g = grade(m);
    }
    montarLuz() {
      const L = this.limites; this.escuro = this.add.renderTexture(L.x0, L.y0, L.x1 - L.x0, L.y1 - L.y0).setOrigin(0, 0).setDepth(1000);
      this.borracha = this.make.image({ key: 'halo', add: false });
      this.luzes = this.mapa.itens.filter((it) => it.luz).map((it) => { const [wx, wy] = iso(it.x + it.w / 2, it.y + it.d / 2, (it.z || 0) + (it.luz.altura || 18));
        return { id: it.id, wx, wy, raio: it.luz.raio, cor: it.luz.cor, ligada: false, brilho: 100, brilhoSprite: this.add.image(wx, wy, 'halo').setBlendMode(Phaser.BlendModes.ADD).setDepth(1001).setVisible(false) }; });
      this.janelas = this.mapa.aberturas.filter((a) => a.tipo === 'janela').map((a) => {
        const [wx, wy] = a.lado === 'n' ? iso(a.em[0] + a.largura / 2, a.em[1] + 1.4) : iso(a.em[0] + 1.4, a.em[1] + a.largura / 2);
        const s = this.add.image(wx, wy - 20, 'feixe').setBlendMode(Phaser.BlendModes.ADD).setDepth(1002).setTint(0xffc983).setAlpha(0);
        s.setAngle(a.lado === 'n' ? -28 : 28).setScale(1.1, 1.2); return { a, s, wx, wy };
      });
    }
    redesenharLuz() {
      const h = horaNY(new Date()); const e = escuridao(h); const cam = this.cameras.main;
      const ativas = luzesAtivas(this.luzes, cam.midPoint.x, cam.midPoint.y);
      this.diag.luzes = ativas.length; this.diag.total = this.luzes.filter((l) => l.ligada).length;
      const L = this.limites; this.escuro.clear(); this.escuro.fill(0x1b1430, e);
      for (const l of ativas) { this.borracha.setScale(l.raio * 2 / 64).setAlpha(Math.min(1, 0.55 + l.brilho / 200)); this.escuro.erase(this.borracha, l.wx - L.x0, l.wy - L.y0); }
      for (const j of this.janelas) j.s.setAlpha(sol(j.a.lado, h) * (1 - e) * 0.55);
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
      this.gato = { x: gp.x, y: gp.y, caminho: [], esp: false, dormindo: true, quadro: 0, t: 0, proxima: this.time.now + 20000 };
      this.spGato = this.add.image(0, 0, 'gato-dormindo').setOrigin(0.5, 0.9);
      this.gGato = grade(this.mapa, ['caminha-gato', 'sofa', 'cama', 'tapete-sala']);
    }
    montarCamera() {
      const cam = this.cameras.main; this.desvio = { x: 0, y: 0 }; this.arrastando = null;
      this.input.on('pointerdown', (p) => { this.arrastando = { x: p.x, y: p.y, dx: this.desvio.x, dy: this.desvio.y }; });
      this.input.on('pointermove', (p) => { if (!this.arrastando || !p.isDown) return; const z = cam.zoom;
        this.desvio.x = Math.max(-420, Math.min(420, this.arrastando.dx - (p.x - this.arrastando.x) / z)); this.desvio.y = Math.max(-260, Math.min(260, this.arrastando.dy - (p.y - this.arrastando.y) / z)); });
      this.input.on('pointerup', () => { this.arrastando = null; this.soltouEm = this.time.now; });
      this.ajustarEscala(); this.scale.on('resize', () => this.ajustarEscala());
      const [x, y] = iso(this.mapa.pontos.porta.x, this.mapa.pontos.porta.y); cam.centerOn(x, y);
    }
    // A escala inteira (DEC-173): celular, pelo menos 180 pixels do jogo na menor dimensão; tablet, 300.
    ajustarEscala(forcar) {
      const w = this.scale.width, h = this.scale.height, menor = Math.min(w, h);
      const auto = menor < 600 ? (menor < 330 ? 2 : 3) : menor >= 1100 ? 5 : 4;
      this.escala = forcar || this.escalaManual || auto; this.cameras.main.setZoom(this.escala).setRoundPixels(true);
    }
    // O que o servidor mandou (o 68): as luzes e o que ela faz.
    atualizar(c) {
      this.estado = c;
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
      const bal = p.caminho.length ? null : deitada ? 'zzz' : p.balao;
      this.spBalao.setVisible(p.visivel && !!bal).setPosition(topo[0] + 4, topo[1] + Math.round(Math.sin(t / 500))); if (bal) this.spBalao.setTexture('balao-' + bal);
      this.spPorta.setVisible(!!p.privado && !!this.portaBanheiro); if (this.portaBanheiro) this.spPorta.setPosition(this.portaBanheiro.wx, this.portaBanheiro.wy);
      this.viverGato(t, dt);
      // a câmera: segue a Pepper suavemente; o desvio do dedo volta sozinho
      if (!this.arrastando && t - (this.soltouEm || 0) > 2000) { this.desvio.x *= 0.95; this.desvio.y *= 0.95; }
      const foco = p.visivel ? [wx, wy - 16] : iso(this.mapa.pontos.fora.x, this.mapa.pontos.fora.y);
      cam.scrollX += ((foco[0] + this.desvio.x - cam.width / 2) - cam.scrollX) * 0.08;
      cam.scrollY += ((foco[1] + this.desvio.y - cam.height / 2) - cam.scrollY) * 0.08;
      if (aoDiagnostico) aoDiagnostico({ fps: this.game.loop.actualFps, luzes: this.diag.luzes, total: this.diag.total, escala: this.escala, w: Math.round(this.scale.width / this.escala), h: Math.round(this.scale.height / this.escala),
        renderer: this.game.renderer.type === Phaser.WEBGL ? 'WebGL' : 'Canvas' });
    }
    // O gato: dorme a maior parte do tempo, de vez em quando vai à janela, aos potes ou dá uma volta (só código).
    viverGato(t, dt) {
      const gt = this.gato; const m = this.mapa;
      if (t > gt.proxima && !gt.caminho.length) {
        const r = Math.random(); const P = m.pontos.gato;
        const op = r < 0.55 ? P.dormir : r < 0.7 ? P.janela : r < 0.85 ? P.andar : [{ x: 8.6, y: 4.4 }];
        const alvo = op[Math.floor(Math.random() * op.length)];
        gt.caminho = caminho(this.gGato, gt, alvo); gt.dormindo = false; gt.vaiDormir = op === P.dormir; gt.proxima = t + 40000 + Math.random() * 80000;
      }
      if (gt.caminho.length) { this.andar(gt, dt, 1.1); gt.t += dt; if (gt.t > 180) { gt.t = 0; gt.quadro = 1 - gt.quadro; } if (!gt.caminho.length) gt.dormindo = !!gt.vaiDormir; }
      const [x, y] = iso(gt.x, gt.y);
      this.spGato.setPosition(x, y).setDepth(profundidadePessoa(gt.x, gt.y) + (gt.dormindo ? 0.7 : 0))
        .setTexture(`gato-${gt.caminho.length ? (gt.quadro ? 'andando1' : 'andando2') : gt.dormindo ? 'dormindo' : 'parado'}${gt.esp ? '-esp' : ''}`);
    }
  }
  const jogo = new Phaser.Game({ type: Phaser.AUTO, parent: pai, pixelArt: true, backgroundColor: '#1b1430', banner: false,
    scale: { mode: Phaser.Scale.RESIZE, width: pai.clientWidth || 390, height: pai.clientHeight || 844 },
    input: { activePointers: 2 }, scene: [Casa] });
  return {
    jogo,
    atualizar: (c) => { if (cena) cena.atualizar(c); else pendente = c; },
    zoom: (d) => { if (!cena) return; cena.escalaManual = Math.max(1, Math.min(5, (cena.escala || 2) + d)); cena.ajustarEscala(); },
    destruir: () => jogo.destroy(true),
  };
}
