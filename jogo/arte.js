// Central — a arte do jogo, desenhada por código, pixel a pixel, na paleta da direção C (DEC-147, DEC-165).
// 100% original: formas simples (caixas isométricas, retângulos) com sombreado, contorno e pontilhado. Nenhuma imagem de
// terceiros, nenhum personagem existente; a Pepper é uma mulher genérica de cabelo acobreado.
// Cada sprite vira um <canvas>; a cena registra como textura do Phaser. A arte da OpenAI (DEC-167), quando vier, entra
// no lugar de cada chave, com o mesmo tamanho e a mesma âncora.

export const PAL = {
  contorno: '#1a1424', sombra: '#2b2140', noite: '#1f2440', azul: '#3b4f8f', azulClaro: '#6b86c9', azulGelo: '#a9c4e8',
  verdeEsc: '#2f6b55', verde: '#6fa36b', verdeClaro: '#9fcf86', bege: '#e8c9a0', caramelo: '#c98b5b', madeira: '#a8714f',
  madeiraEsc: '#7a4a35', vinho: '#4a2f3a', rosa: '#b8475a', rosaClaro: '#e58a9b', vermelho: '#e0405a', amarelo: '#f6d76b',
  creme: '#fff8ec', telha: '#8a3b2a', pele: '#f2c3a0', peleSombra: '#d99a78', parede: '#b78a8f', paredeEsc: '#8f6670',
  paredeClara: '#d8b0ac', azulejo: '#cfe0e6', azulejoEsc: '#9db8c4', cinza: '#6f6a7a', cinzaClaro: '#b7b2c4', preto: '#141018',
  cabelo: '#9c3f22', cabeloClaro: '#c9643a', cabeloEsc: '#6e2a17', blusa: '#2f6b55', blusaClara: '#4f8f6a', calca: '#3b4f8f',
  calcaEsc: '#2a3870', gato: '#d9894a', gatoClaro: '#f0b070', gatoEsc: '#9c5a2a',
};
const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const mistura = (a, b, t) => { const x = hex(a), y = hex(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const claro = (c, t = 0.25) => mistura(c, '#fff4e0', t);
const escuro = (c, t = 0.3) => mistura(c, '#1a1424', t);

// ---------------------------------------------------------------- o pincel
export class Pincel {
  constructor(w, h) {
    this.w = Math.ceil(w); this.h = Math.ceil(h);
    this.canvas = typeof OffscreenCanvas !== 'undefined' && !globalThis.document ? new OffscreenCanvas(this.w, this.h) : Object.assign(document.createElement('canvas'), { width: this.w, height: this.h });
    this.ctx = this.canvas.getContext('2d');
    this.px = new Array(this.w * this.h).fill(null);
  }
  ponto(x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h && c) this.px[y * this.w + x] = c; }
  retangulo(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.ponto(x + i, y + j, c); }
  // polígono convexo, preenchido por linhas (pixels inteiros, sem suavizar)
  poligono(pts, c, dither) {
    const ys = pts.map((p) => p[1]); const y0 = Math.ceil(Math.min(...ys)), y1 = Math.floor(Math.max(...ys));
    for (let y = y0; y <= y1; y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= y + 0.5 && by > y + 0.5) || (by <= y + 0.5 && ay > y + 0.5)) xs.push(ax + (y + 0.5 - ay) * (bx - ax) / (by - ay));
      }
      if (xs.length < 2) continue;
      const a = Math.round(Math.min(...xs)), b = Math.round(Math.max(...xs)) - 1;
      for (let x = a; x <= b; x++) this.ponto(x, y, dither && (x + y) % 2 === 0 ? dither : c);
    }
  }
  linha(x0, y0, x1, y1, c) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let k = 0; k <= n; k++) this.ponto(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n, c); }
  // o contorno de fora: todo pixel vazio encostado num pixel pintado
  contornar(c = PAL.contorno) {
    const novo = this.px.slice();
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.px[y * this.w + x]) continue;
      const viz = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const a = x + dx, b = y + dy; return a >= 0 && b >= 0 && a < this.w && b < this.h && this.px[b * this.w + a] && this.px[b * this.w + a] !== c; });
      if (viz) novo[y * this.w + x] = c;
    }
    this.px = novo;
  }
  espelhar() { const n = new Pincel(this.w, this.h); for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) n.px[y * this.w + (this.w - 1 - x)] = this.px[y * this.w + x]; return n; }
  pronto() {
    const img = this.ctx.createImageData(this.w, this.h);
    this.px.forEach((c, i) => { if (!c) return; const [r, g, b] = hex(c); img.data.set([r, g, b, 255], i * 4); });
    this.ctx.putImageData(img, 0, 0); return this.canvas;
  }
}

// ---------------------------------------------------------------- isométrico: 1 bloco = 32 x 16
export const BX = 16, BY = 8;
// Um sprite de item com pegada w x d (em blocos) e altura h (px): a âncora é o canto de trás do chão (o 0,0 da pegada).
export function novoItem(w, d, h) {
  const p = new Pincel((w + d) * BX + 2, (w + d) * BY + h + 2);
  p.ox = d * BX + 1; p.oy = h + 1; p.ancora = [p.ox / p.w, p.oy / p.h]; return p;
}
// O ponto (x, y, z) da pegada (em blocos e px) no sprite.
const P = (p, x, y, z = 0) => [p.ox + (x - y) * BX, p.oy + (x + y) * BY - z];
// Uma caixa isométrica em (x, y) da pegada, com w x d x h, e as três faces sombreadas.
export function caixa(p, x, y, w, d, h, cor, opc = {}) {
  const z = opc.z || 0;
  const topo = opc.topo || claro(cor, 0.18), esq = cor, dir = opc.dir || escuro(cor, 0.22);
  p.poligono([P(p, x, y + d, z), P(p, x + w, y + d, z), P(p, x + w, y + d, z + h), P(p, x, y + d, z + h)], esq, opc.ditherEsq);
  p.poligono([P(p, x + w, y, z), P(p, x + w, y + d, z), P(p, x + w, y + d, z + h), P(p, x + w, y, z + h)], dir, opc.ditherDir);
  p.poligono([P(p, x, y, z + h), P(p, x + w, y, z + h), P(p, x + w, y + d, z + h), P(p, x, y + d, z + h)], topo, opc.ditherTopo);
  if (opc.aresta !== false) { const a = P(p, x, y + d, z + h), b = P(p, x + w, y + d, z + h), c = P(p, x + w, y, z + h); p.linha(a[0], a[1], b[0], b[1], claro(topo, 0.3)); p.linha(b[0], b[1], c[0], c[1], claro(topo, 0.15)); }
}
// Um retângulo pintado numa face (a da esquerda, voltada para +y, ou a da direita, voltada para +x).
function naFaceEsq(p, x, y, z, w, h, cor) { p.poligono([P(p, x, y, z), P(p, x + w, y, z), P(p, x + w, y, z + h), P(p, x, y, z + h)], cor); }
function naFaceDir(p, x, y, z, d, h, cor) { p.poligono([P(p, x, y, z), P(p, x, y + d, z), P(p, x, y + d, z + h), P(p, x, y, z + h)], cor); }
const losango = (p, x, y, w, d, z, cor, dither) => p.poligono([P(p, x, y, z), P(p, x + w, y, z), P(p, x + w, y + d, z), P(p, x, y + d, z)], cor, dither);

// ---------------------------------------------------------------- pisos e paredes
export function piso(tipo) {
  const p = novoItem(1, 1, 0);
  const cores = { calcada: [PAL.cinza, mistura(PAL.cinza, PAL.cinzaClaro, 0.35)], asfalto: [mistura(PAL.noite, PAL.cinza, 0.35), mistura(PAL.noite, PAL.cinza, 0.5)],
    asfalto_faixa: [mistura(PAL.noite, PAL.cinza, 0.35), PAL.amarelo], tijolo: [PAL.telha, PAL.madeiraEsc], madeira: [PAL.madeira, PAL.caramelo], terracota: [PAL.telha, mistura(PAL.telha, PAL.caramelo, 0.4)], carpete: [mistura(PAL.rosa, PAL.vinho, 0.35), mistura(PAL.rosa, PAL.bege, 0.2)], azulejo: [PAL.azulejo, PAL.azulejoEsc],
    piso_frio: [PAL.cinzaClaro, mistura(PAL.cinzaClaro, PAL.cinza, 0.4)], taco: [PAL.caramelo, PAL.madeira], cimento: [mistura(PAL.cinza, PAL.cinzaClaro, 0.5), PAL.cinza], grama: [PAL.verde, PAL.verdeEsc] }[tipo] || [PAL.madeira, PAL.caramelo];
  losango(p, 0, 0, 1, 1, 0, cores[0], tipo === 'carpete' || tipo === 'cimento' || tipo === 'grama' ? cores[1] : null);
  if (tipo === 'taco') for (const k of [0.25, 0.75]) { const a = P(p, k, 0), b = P(p, k, 1); p.linha(a[0], a[1], b[0], b[1], cores[1]); }
  if (tipo === 'piso_frio') { const a = P(p, 0.5, 0), b = P(p, 0.5, 1), c = P(p, 0, 0.5), d = P(p, 1, 0.5); p.linha(a[0], a[1], b[0], b[1], cores[1]); p.linha(c[0], c[1], d[0], d[1], cores[1]); }
  if (tipo === 'madeira') for (let k = 1; k < 4; k++) { const a = P(p, 0, k / 4), b = P(p, 1, k / 4); p.linha(a[0], a[1], b[0], b[1], PAL.madeiraEsc); }
  if (tipo === 'madeira') { const a = P(p, 0.5, 0.25), b = P(p, 0.5, 0.5); p.linha(a[0], a[1], b[0], b[1], PAL.madeiraEsc); }
  if (tipo === 'asfalto') for (let k = 0; k < 10; k++) { const a = P(p, ((k * 37) % 10) / 10, ((k * 53) % 10) / 10); p.ponto(a[0], a[1], cores[1]); }
  if (tipo === 'asfalto_faixa') { const a = P(p, 0.2, 0.5), b = P(p, 0.7, 0.5); p.linha(a[0], a[1], b[0], b[1], cores[1]); }
  if (tipo === 'calcada') { const a = P(p, 0.5, 0), b = P(p, 0.5, 1), c = P(p, 0, 0.5), d = P(p, 1, 0.5); p.linha(a[0], a[1], b[0], b[1], PAL.cinzaClaro); p.linha(c[0], c[1], d[0], d[1], PAL.cinzaClaro); }
  if (tipo === 'tijolo') for (const k of [0.25, 0.5, 0.75]) { const a = P(p, 0, k), b = P(p, 1, k); p.linha(a[0], a[1], b[0], b[1], cores[1]); }
  if (tipo === 'terracota' || tipo === 'azulejo') { const a = P(p, 0.5, 0), b = P(p, 0.5, 1), c = P(p, 0, 0.5), d = P(p, 1, 0.5); p.linha(a[0], a[1], b[0], b[1], cores[1]); p.linha(c[0], c[1], d[0], d[1], cores[1]); }
  return p;
}
// As cores de parede do construtor (DEC-176): a tinta e a sombra.
export const CORES_PAREDE = { rosado: [PAL.parede, PAL.paredeEsc], azulejo: [PAL.azulejo, PAL.azulejoEsc], creme: ['#e6d3b3', '#bfa784'], verde: ['#8fb39a', '#6a8f76'],
  azul: ['#8fa6c9', '#6a7fa3'], cinza: ['#a9a4b3', '#827d8e'], tijolo: [PAL.telha, PAL.madeiraEsc] };
export const PISOS = ['madeira', 'terracota', 'carpete', 'azulejo', 'piso_frio', 'taco', 'cimento'];
// Um pedaço de parede de 1 bloco. lado "n": corre ao longo de x (a face olha para +y); "w": ao longo de y (olha para +x).
export function parede(lado, altura, tipo = 'parede', cor = 'rosado') {
  const n = lado === 'n'; const p = novoItem(n ? 1 : 0.25, n ? 0.25 : 1, altura + 4);
  const [base, sombra] = CORES_PAREDE[cor] || CORES_PAREDE.rosado;
  if (n) caixa(p, 0, 0, 1, 0.25, altura, base, { dir: sombra, topo: PAL.paredeClara });
  else caixa(p, 0, 0, 0.25, 1, altura, base, { dir: base, topo: PAL.paredeClara });
  const face = (z, h, c) => (n ? naFaceEsq(p, 0, 0.25, z, 1, h, c) : naFaceDir(p, 0.25, 0, z, 1, h, c));
  if (altura > 20) { face(0, 3, PAL.madeiraEsc); face(altura - 3, 3, PAL.paredeClara); }
  if (tipo === 'janela') {
    const w = (zz, hh, c, a = 0.15, b = 0.85) => (n ? naFaceEsq(p, a, 0.25, zz, b - a, hh, c) : naFaceDir(p, 0.25, a, zz, b - a, hh, c));
    w(14, 26, PAL.madeiraEsc); w(16, 22, PAL.azulGelo, 0.2, 0.8); w(16, 22, PAL.azulClaro, 0.2, 0.5); w(26, 1, PAL.madeiraEsc, 0.2, 0.8);
    w(12, 2, PAL.bege, 0.1, 0.9);
    w(14, 28, PAL.rosaClaro, 0.06, 0.18); w(14, 28, PAL.rosaClaro, 0.82, 0.94);
  }
  if (tipo === 'porta') {
    const w = (zz, hh, c, a, b) => (n ? naFaceEsq(p, a, 0.25, zz, b - a, hh, c) : naFaceDir(p, 0.25, a, zz, b - a, hh, c));
    w(0, Math.min(altura, 38), PAL.madeiraEsc, 0.15, 0.85); w(2, Math.min(altura, 36) - 4, PAL.madeira, 0.2, 0.8); w(16, 2, PAL.amarelo, 0.68, 0.74);
  }
  if (altura > 20) p.contornar(); return p;
}

// ---------------------------------------------------------------- os itens (o desenho de cada modelo)
const planta = (p, x, y, z, r, cor = PAL.verde) => {
  for (let k = 0; k < 14 * r; k++) { const a = k * 2.399, d = Math.sqrt(k / (14 * r)) * r * 6; const [px, py] = P(p, x, y, z); p.retangulo(px + Math.cos(a) * d * 1.3 - 1, py + Math.sin(a) * d - 1, 3, 2, k % 3 ? cor : PAL.verdeClaro); }
};
const M = {
  sofa: (p) => { caixa(p, 0, 0.55, 3, 0.45, 9, PAL.rosa); caixa(p, 0, 0, 3, 0.55, 18, mistura(PAL.rosa, PAL.vinho, 0.2)); caixa(p, 0, 0.1, 0.3, 0.9, 13, PAL.rosa); caixa(p, 2.7, 0.1, 0.3, 0.9, 13, PAL.rosa);
    caixa(p, 0.4, 0.45, 0.7, 0.2, 9, PAL.amarelo, { z: 9 }); caixa(p, 1.9, 0.45, 0.6, 0.2, 8, PAL.creme, { z: 9 }); caixa(p, 1.2, 0.55, 0.8, 0.3, 1, PAL.azulClaro, { z: 9 }); },
  manta: (p) => caixa(p, 0, 0, 0.8, 0.5, 2, PAL.verdeEsc, { ditherTopo: PAL.blusaClara }),
  tapete: (p) => { losango(p, 0, 0, 3, 2, 0, PAL.azul); losango(p, 0.2, 0.2, 2.6, 1.6, 0, PAL.telha, PAL.caramelo); losango(p, 0.5, 0.5, 2, 1, 0, PAL.azul); },
  tapete_redondo: (p) => { losango(p, 0, 0, 1.4, 1.4, 0, PAL.verdeEsc); losango(p, 0.2, 0.2, 1, 1, 0, PAL.bege, PAL.verdeClaro); },
  pufe: (p) => caixa(p, 0.15, 0.15, 0.7, 0.7, 8, PAL.amarelo),
  mesa_baixa: (p) => { caixa(p, 0, 0, 1.5, 1, 7, PAL.madeiraEsc); caixa(p, 0, 0, 1.5, 1, 2, PAL.madeira, { z: 7 }); caixa(p, 0.3, 0.3, 0.3, 0.2, 2, PAL.creme, { z: 9 }); caixa(p, 0.9, 0.4, 0.4, 0.3, 3, PAL.azul, { z: 9 }); },
  estante: (p) => { caixa(p, 0, 0, 1, 2, 44, PAL.madeiraEsc, { dir: PAL.madeira });
    const cores = [PAL.vermelho, PAL.azulClaro, PAL.amarelo, PAL.verde, PAL.creme, PAL.rosa, PAL.telha];
    for (let s = 0; s < 4; s++) for (let k = 0; k < 9; k++) naFaceDir(p, 1, 0.1 + k * 0.2, 4 + s * 10, 0.16, 6 + (k % 3), cores[(k + s * 2) % cores.length]); },
  toca_discos: (p) => { caixa(p, 0.1, 0.1, 0.8, 0.8, 10, PAL.madeiraEsc); caixa(p, 0.15, 0.15, 0.7, 0.7, 2, PAL.preto, { z: 10 }); losango(p, 0.3, 0.3, 0.4, 0.4, 12, PAL.vinho); },
  tv: (p) => { caixa(p, 0, 0, 2, 0.3, 22, PAL.preto); naFaceEsq(p, 0.1, 0.3, 2, 1.8, 18, PAL.noite); naFaceEsq(p, 0.3, 0.3, 12, 0.6, 6, PAL.azul); },
  mesa: (p) => { caixa(p, 0.05, 0.05, 0.1, 0.1, 14, PAL.madeiraEsc); caixa(p, 1.45, 0.85, 0.1, 0.1, 14, PAL.madeiraEsc); caixa(p, 0.05, 0.85, 0.1, 0.1, 14, PAL.madeiraEsc); caixa(p, 0, 0, 1.6, 1, 2, PAL.madeira, { z: 14 }); },
  cadeira: (p) => { caixa(p, 0.1, 0.1, 0.6, 0.6, 9, PAL.cinza); caixa(p, 0.1, 0.1, 0.6, 0.15, 20, PAL.cinza); },
  monitor: (p) => { caixa(p, 0.3, 0.15, 0.2, 0.1, 4, PAL.cinza); caixa(p, 0, 0.1, 0.8, 0.15, 12, PAL.preto, { z: 4 }); naFaceEsq(p, 0.05, 0.25, 5, 0.7, 10, PAL.azulClaro); },
  lava: (p) => { caixa(p, 0.05, 0.05, 0.3, 0.3, 3, PAL.cinza); caixa(p, 0.1, 0.1, 0.2, 0.2, 9, PAL.vermelho, { z: 3, ditherEsq: PAL.amarelo }); },
  abajur_chao: (p) => { caixa(p, 0.1, 0.1, 0.4, 0.4, 2, PAL.madeiraEsc); caixa(p, 0.27, 0.27, 0.06, 0.06, 32, PAL.madeiraEsc, { z: 2 }); caixa(p, 0, 0, 0.6, 0.6, 12, PAL.bege, { z: 30, topo: PAL.amarelo }); },
  abajur_mesa: (p) => { caixa(p, 0.1, 0.1, 0.2, 0.2, 5, PAL.verdeEsc); caixa(p, 0, 0, 0.4, 0.4, 6, PAL.creme, { z: 5, topo: PAL.amarelo }); },
  luminaria_leitura: (p) => { caixa(p, 0.1, 0.1, 0.2, 0.2, 2, PAL.preto); caixa(p, 0.17, 0.17, 0.06, 0.06, 30, PAL.preto, { z: 2 }); caixa(p, 0, 0, 0.4, 0.4, 6, PAL.amarelo, { z: 30 }); },
  pendente: (p) => { caixa(p, 0.22, 0.22, 0.06, 0.06, 20, PAL.preto, { z: 6 }); caixa(p, 0, 0, 0.5, 0.5, 6, PAL.verdeEsc, { topo: PAL.verde }); },
  luzinhas: (p, it) => { for (let k = 0; k <= it.w * 4; k++) { const [x, y] = P(p, k / 4, 0.1, Math.sin(k * 0.8) * 2 + 4); p.ponto(x, y - 1, PAL.contorno); p.retangulo(x, y, 2, 2, k % 2 ? PAL.amarelo : PAL.creme); } },
  fita_led: (p, it) => { for (let k = 0; k <= it.d * 6; k++) { const [x, y] = P(p, 0.1, k / 6, 2); p.retangulo(x, y, 2, 1, PAL.rosaClaro); } },
  luz_armario: (p, it) => caixa(p, 0, 0, it.w, 0.2, 2, PAL.bege, { topo: PAL.amarelo }),
  quadro: (p) => { caixa(p, 0, 0, 0.15, 1, 16, PAL.madeiraEsc); naFaceDir(p, 0.15, 0.1, 2, 0.8, 12, PAL.azulClaro); naFaceDir(p, 0.15, 0.1, 2, 0.8, 5, PAL.verde); naFaceDir(p, 0.15, 0.55, 9, 0.15, 3, PAL.amarelo); },
  relogio: (p) => { caixa(p, 0, 0, 0.6, 0.15, 10, PAL.creme); naFaceEsq(p, 0.28, 0.15, 5, 0.04, 4, PAL.contorno); naFaceEsq(p, 0.28, 0.15, 5, 0.2, 1, PAL.contorno); },
  relogio_j: (p) => { caixa(p, 0, 0, 0.15, 0.6, 10, PAL.amarelo); naFaceDir(p, 0.15, 0.25, 3, 0.1, 5, PAL.contorno); naFaceDir(p, 0.15, 0.2, 3, 0.25, 1, PAL.contorno); },
  aquario: (p) => { caixa(p, 0, 0, 1, 1, 10, PAL.madeiraEsc); caixa(p, 0.05, 0.05, 0.9, 0.9, 14, PAL.azulClaro, { z: 10, topo: PAL.azulGelo, ditherEsq: PAL.azul });
    naFaceEsq(p, 0.3, 0.95, 16, 0.12, 2, PAL.amarelo); naFaceEsq(p, 0.6, 0.95, 20, 0.12, 2, PAL.vermelho); planta(p, 0.2, 0.8, 12, 0.6); },
  planta_grande: (p) => { caixa(p, 0.15, 0.15, 0.5, 0.5, 8, PAL.telha); planta(p, 0.4, 0.4, 24, 2.2); },
  planta_pequena: (p) => { caixa(p, 0.1, 0.1, 0.3, 0.3, 5, PAL.telha); planta(p, 0.25, 0.25, 11, 1); },
  planta_pendurada: (p) => { caixa(p, 0.2, 0.1, 0.3, 0.2, 5, PAL.creme); for (let k = 0; k < 7; k++) { const [x, y] = P(p, 0.2 + k * 0.06, 0.3, 4 - k * 2.4); p.retangulo(x, y, 2, 3, k % 2 ? PAL.verde : PAL.verdeClaro); } },
  vasinhos: (p) => { caixa(p, 0, 0, 1.6, 0.3, 2, PAL.madeira); for (let k = 0; k < 3; k++) { caixa(p, 0.15 + k * 0.5, 0.05, 0.25, 0.2, 4, PAL.telha, { z: 2 }); planta(p, 0.27 + k * 0.5, 0.15, 9, 0.6); } },
  violao: (p) => { caixa(p, 0.1, 0.1, 0.25, 0.15, 10, PAL.caramelo); caixa(p, 0.12, 0.12, 0.2, 0.1, 8, PAL.caramelo, { z: 10 }); caixa(p, 0.18, 0.13, 0.08, 0.06, 14, PAL.madeiraEsc, { z: 18 }); },
  cesto: (p) => { caixa(p, 0.05, 0.05, 0.5, 0.5, 7, PAL.caramelo, { ditherEsq: PAL.madeira }); caixa(p, 0.15, 0.15, 0.3, 0.1, 4, PAL.azulClaro, { z: 7 }); },
  livros: (p) => { caixa(p, 0, 0, 0.5, 0.35, 2, PAL.vermelho); caixa(p, 0.05, 0.02, 0.45, 0.3, 2, PAL.azul, { z: 2 }); caixa(p, 0, 0.05, 0.4, 0.3, 2, PAL.amarelo, { z: 4 }); },
  chinelos: (p) => { losango(p, 0, 0, 0.25, 0.4, 1, PAL.rosaClaro); losango(p, 0.3, 0, 0.25, 0.4, 1, PAL.rosaClaro); },
  caminha_gato: (p) => { caixa(p, 0.05, 0.05, 0.9, 0.9, 5, PAL.azul); losango(p, 0.2, 0.2, 0.6, 0.6, 3, PAL.creme, PAL.bege); },
  caixa_areia: (p) => { caixa(p, 0.05, 0.05, 0.9, 0.9, 5, PAL.cinzaClaro); losango(p, 0.15, 0.15, 0.7, 0.7, 4, PAL.bege, PAL.caramelo); },
  potes_gato: (p) => { caixa(p, 0, 0, 0.35, 0.35, 3, PAL.vermelho); caixa(p, 0.4, 0.1, 0.35, 0.35, 3, PAL.azulClaro); losango(p, 0.05, 0.05, 0.25, 0.25, 3, PAL.caramelo); },
  arranhador: (p) => { caixa(p, 0, 0, 0.8, 0.8, 3, PAL.bege); caixa(p, 0.3, 0.3, 0.2, 0.2, 22, PAL.caramelo, { z: 3, ditherEsq: PAL.bege }); caixa(p, 0.1, 0.1, 0.6, 0.6, 3, PAL.bege, { z: 25 }); },
  fogao: (p) => { caixa(p, 0, 0, 1, 1, 15, PAL.creme); losango(p, 0.15, 0.15, 0.3, 0.3, 15, PAL.preto); losango(p, 0.55, 0.55, 0.3, 0.3, 15, PAL.preto); naFaceEsq(p, 0.1, 1, 2, 0.8, 9, PAL.cinza); },
  pia: (p) => { caixa(p, 0, 0, 1.2, 1, 15, PAL.madeira, { topo: PAL.cinzaClaro }); losango(p, 0.2, 0.2, 0.8, 0.6, 15, PAL.azulejoEsc); caixa(p, 0.55, 0.1, 0.1, 0.1, 6, PAL.cinza, { z: 15 }); },
  bancada: (p) => { caixa(p, 0, 0, 1.8, 1, 15, PAL.madeira, { topo: PAL.bege }); naFaceEsq(p, 0.2, 1, 3, 0.6, 9, PAL.madeiraEsc); naFaceEsq(p, 1, 1, 3, 0.6, 9, PAL.madeiraEsc); caixa(p, 1.3, 0.5, 0.3, 0.3, 3, PAL.caramelo, { z: 15 }); },
  cafeteira: (p) => { caixa(p, 0, 0, 0.4, 0.4, 9, PAL.preto); caixa(p, 0.05, 0.15, 0.25, 0.25, 4, PAL.vermelho); },
  micro_ondas: (p) => { caixa(p, 0, 0, 0.7, 0.5, 8, PAL.cinzaClaro); naFaceEsq(p, 0.05, 0.5, 1, 0.45, 6, PAL.noite); },
  prateleira: (p, it) => { caixa(p, 0, 0, it.w, 0.3, 2, PAL.madeira); const c = [PAL.creme, PAL.azulClaro, PAL.amarelo, PAL.vermelho, PAL.verde]; for (let k = 0; k < it.w * 3; k++) caixa(p, 0.1 + k * 0.33, 0.05, 0.2, 0.2, 4 + (k % 2) * 2, c[k % c.length], { z: 2 }); },
  geladeira: (p) => { caixa(p, 0, 0, 0.9, 1, 46, PAL.creme, { dir: PAL.cinzaClaro }); naFaceEsq(p, 0.02, 1, 30, 0.86, 1, PAL.cinza); naFaceEsq(p, 0.7, 1, 20, 0.05, 8, PAL.cinza);
    naFaceEsq(p, 0.2, 1, 34, 0.2, 5, PAL.vermelho); naFaceEsq(p, 0.45, 1, 36, 0.2, 6, PAL.azulClaro); },
  mesa_jantar: (p) => { for (const [a, b] of [[0.1, 0.1], [1.8, 0.1], [0.1, 1.2], [1.8, 1.2]]) caixa(p, a, b, 0.1, 0.1, 13, PAL.madeiraEsc);
    caixa(p, 0, 0, 2, 1.4, 2, PAL.madeira, { z: 13 }); losango(p, 0.15, 0.15, 1.7, 1.1, 15, PAL.vermelho, PAL.creme); caixa(p, 0.85, 0.6, 0.25, 0.2, 5, PAL.caramelo, { z: 15 }); planta(p, 1, 0.7, 22, 0.7, PAL.rosa); },
  lixeira: (p) => caixa(p, 0, 0, 0.5, 0.5, 10, PAL.cinza),
  cama: (p, it) => { caixa(p, 0, 0, 2, 0.3, 26, PAL.madeiraEsc); caixa(p, 0, 0.3, 2, it.d - 0.3, 8, PAL.madeira); caixa(p, 0.05, 0.3, 1.9, it.d - 0.35, 5, PAL.creme, { z: 8 });
    caixa(p, 0.2, 0.35, 0.7, 0.4, 4, PAL.creme, { z: 13, topo: '#fffdf8' }); caixa(p, 1.1, 0.35, 0.7, 0.4, 4, PAL.creme, { z: 13, topo: '#fffdf8' });
    caixa(p, 0.05, 0.85, 1.9, it.d - 0.9, 3, PAL.azul, { z: 12, ditherTopo: PAL.azulClaro }); caixa(p, 0.05, it.d - 0.45, 1.9, 0.4, 3, PAL.amarelo, { z: 12 }); },
  criado: (p) => { caixa(p, 0, 0, 0.6, 0.6, 12, PAL.madeira); naFaceEsq(p, 0.1, 0.6, 5, 0.4, 1, PAL.madeiraEsc); },
  guarda_roupa: (p, it) => { caixa(p, 0, 0, it.w, it.d, 34, PAL.madeira, { dir: mistura(PAL.madeira, PAL.caramelo, 0.3) }); naFaceEsq(p, it.w / 2, it.d, 2, 0.03, 30, PAL.madeiraEsc); naFaceEsq(p, it.w / 2 - 0.15, it.d, 16, 0.06, 5, PAL.amarelo); naFaceEsq(p, it.w / 2 + 0.1, it.d, 16, 0.06, 5, PAL.amarelo); },
  poltrona: (p) => { caixa(p, 0.1, 0.1, 0.8, 0.8, 8, PAL.verdeEsc); caixa(p, 0.1, 0.1, 0.8, 0.25, 18, PAL.verdeEsc); caixa(p, 0.1, 0.1, 0.15, 0.8, 12, PAL.verdeEsc); caixa(p, 0.75, 0.1, 0.15, 0.8, 12, PAL.verdeEsc); caixa(p, 0.3, 0.35, 0.4, 0.35, 2, PAL.amarelo, { z: 8 }); },
  comoda: (p) => { caixa(p, 0, 0, 0.8, 0.7, 18, PAL.madeiraEsc); naFaceEsq(p, 0.1, 0.7, 4, 0.6, 1, PAL.madeira); naFaceEsq(p, 0.1, 0.7, 11, 0.6, 1, PAL.madeira); caixa(p, 0.1, 0.1, 0.15, 0.15, 5, PAL.rosaClaro, { z: 18 }); caixa(p, 0.4, 0.05, 0.3, 0.08, 14, PAL.azulGelo, { z: 18 }); },
  banheira: (p) => { caixa(p, 0, 0, 1.6, 1, 11, PAL.creme, { dir: PAL.cinzaClaro }); losango(p, 0.15, 0.15, 1.3, 0.7, 11, PAL.azulGelo, PAL.creme); },
  vaso_sanitario: (p) => { caixa(p, 0.1, 0.1, 0.4, 0.4, 7, PAL.creme); caixa(p, 0.1, 0.05, 0.4, 0.15, 12, PAL.creme); },
  poste: (p) => { caixa(p, 0.1, 0.1, 0.2, 0.2, 4, PAL.preto); caixa(p, 0.15, 0.15, 0.1, 0.1, 44, PAL.cinza, { z: 4 }); caixa(p, 0.05, 0.05, 0.3, 0.3, 4, PAL.preto, { z: 46 }); caixa(p, 0.1, 0.1, 0.2, 0.2, 3, PAL.amarelo, { z: 43, topo: PAL.creme }); },
  arvore: (p) => { caixa(p, 0.3, 0.3, 0.2, 0.2, 18, PAL.madeiraEsc); planta(p, 0.4, 0.4, 32, 3.2, PAL.verdeEsc); planta(p, 0.4, 0.4, 36, 1.6); },
  banco: (p) => { caixa(p, 0.05, 0.05, 0.1, 0.1, 6, PAL.preto); caixa(p, 1.05, 0.35, 0.1, 0.1, 6, PAL.preto); caixa(p, 0, 0, 1.2, 0.5, 2, PAL.madeira, { z: 6 }); caixa(p, 0, 0, 1.2, 0.12, 8, PAL.madeira, { z: 8 }); },
  hidrante: (p) => { caixa(p, 0, 0, 0.3, 0.3, 10, PAL.vermelho); caixa(p, 0.05, 0.05, 0.2, 0.2, 3, PAL.vermelho, { z: 10 }); },
  capacho: (p) => losango(p, 0, 0, 1, 0.6, 0, PAL.caramelo, PAL.madeira),
  // a escada (sobe para o fundo) e o interruptor de parede (DEC-176)
  escada: (p, it) => { const n = 6; for (let k = 0; k < n; k++) caixa(p, 0, it.d - (k + 1) * it.d / n, it.w, it.d / n, (k + 1) * 6, k % 2 ? PAL.madeira : PAL.caramelo, { dir: PAL.madeiraEsc }); },
  interruptor: (p) => { caixa(p, 0, 0, 0.12, 0.5, 9, PAL.creme); naFaceDir(p, 0.12, 0.18, 3, 0.14, 3, PAL.cinza); },
  cesto_roupa: (p) => { caixa(p, 0.05, 0.05, 0.5, 0.5, 9, PAL.bege, { ditherEsq: PAL.caramelo }); },
  pia_banheiro: (p) => { caixa(p, 0, 0, 0.8, 0.6, 12, PAL.madeira, { topo: PAL.creme }); losango(p, 0.2, 0.15, 0.4, 0.3, 12, PAL.azulejoEsc); },
};
// O tamanho máximo de cada modelo (a altura em px), para alocar o sprite.
const ALT = { escada: 40, interruptor: 12, poste: 52, arvore: 56, estante: 46, geladeira: 48, guarda_roupa: 36, abajur_chao: 44, luminaria_leitura: 38, cama: 28, arranhador: 28, planta_grande: 40, tv: 24, aquario: 30, pendente: 28, cadeira: 22, sofa: 22, mesa_jantar: 30, luzinhas: 10, planta_pendurada: 8, fita_led: 6, quadro: 18 };
export function item(it) {
  const desenho = M[it.modelo]; if (!desenho) return null;
  const p = novoItem(it.w, it.d, (ALT[it.modelo] || 22) + 6);
  desenho(p, it); p.contornar(); return p;
}
export const MODELOS = Object.keys(M);

// ---------------------------------------------------------------- a Pepper (16 x 32) e o gato (18 x 14)
// Frente (sudeste, de três quartos) e costas (nordeste); os outros dois lados são espelhados (DEC-147).
const ESTILO_PEPPER = { pele: PAL.pele, peleSombra: PAL.peleSombra, cabelo: PAL.cabelo, cabeloClaro: PAL.cabeloClaro, cabeloEsc: PAL.cabeloEsc, blusa: PAL.blusa, blusaClara: PAL.blusaClara,
  calca: PAL.calca, calcaEsc: PAL.calcaEsc, sapato: PAL.vinho, tipo: 'longo', barba: 'nenhuma', boca: PAL.rosa, bochecha: PAL.rosaClaro };
function pessoa(lado, quadro, pose, E = ESTILO_PEPPER) {
  const p = new Pincel(18, 34); const C = { ...PAL, ...E, vinho: E.sapato };
  const passo = pose === 'andando' ? [0, 1, 0, -1][quadro] : 0;
  const sobe = pose === 'andando' && quadro % 2 === 1 ? -1 : 0;
  const sentada = pose === 'sentada'; const y0 = (sentada ? 4 : 0) + sobe + 1; const x0 = 1;
  // pernas
  if (sentada) { p.retangulo(x0 + 5, y0 + 23, 3, 3, C.calca); p.retangulo(x0 + 8, y0 + 23, 3, 3, C.calcaEsc); p.retangulo(x0 + 5, y0 + 26, 3, 2, C.vinho); p.retangulo(x0 + 8, y0 + 26, 3, 2, C.vinho); }
  else { p.retangulo(x0 + 5, y0 + 23 + Math.max(0, passo), 3, 6 - Math.abs(passo), C.calca); p.retangulo(x0 + 8, y0 + 23 + Math.max(0, -passo), 3, 6 - Math.abs(passo), C.calcaEsc);
    p.retangulo(x0 + 5, y0 + 29, 3, 2, C.vinho); p.retangulo(x0 + 8, y0 + 29, 3, 2, C.vinho); }
  // tronco e braços
  p.retangulo(x0 + 4, y0 + 14, 8, 10, C.blusa); p.retangulo(x0 + 5, y0 + 15, 3, 8, C.blusaClara);
  p.retangulo(x0 + 2, y0 + 15 + passo, 2, 7, C.blusa); p.retangulo(x0 + 12, y0 + 15 - passo, 2, 7, C.blusa);
  p.retangulo(x0 + 2, y0 + 22 + passo, 2, 2, C.pele); p.retangulo(x0 + 12, y0 + 22 - passo, 2, 2, C.pele);
  p.retangulo(x0 + 7, y0 + 12, 2, 2, C.peleSombra);
  // cabeça
  p.retangulo(x0 + 4, y0 + 4, 8, 9, C.pele); p.ponto(x0 + 4, y0 + 12, null);
  const t = E.tipo;
  if (lado === 'frente') {
    p.ponto(x0 + 7, y0 + 8, C.preto); p.ponto(x0 + 10, y0 + 8, C.preto); if (E.bochecha) { p.ponto(x0 + 6, y0 + 10, C.bochecha); p.ponto(x0 + 11, y0 + 10, C.bochecha); }
    p.retangulo(x0 + 8, y0 + 11, 2, 1, E.boca || C.peleSombra);
    if (t === 'longo') { p.retangulo(x0 + 3, y0 + 2, 10, 4, C.cabelo); p.retangulo(x0 + 4, y0 + 1, 8, 2, C.cabeloClaro);
      p.retangulo(x0 + 3, y0 + 5, 2, 12, C.cabelo); p.retangulo(x0 + 11, y0 + 5, 2, 9, C.cabeloEsc); p.retangulo(x0 + 6, y0 + 5, 4, 1, C.cabelo); }
    else if (t === 'curto' || t === 'medio') { p.retangulo(x0 + 3, y0 + 2, 10, 3, C.cabelo); p.retangulo(x0 + 4, y0 + 1, 8, 2, C.cabeloClaro);
      p.retangulo(x0 + 3, y0 + 4, 1, t === 'medio' ? 7 : 3, C.cabelo); p.retangulo(x0 + 12, y0 + 4, 1, t === 'medio' ? 7 : 3, C.cabeloEsc); }
    else if (t === 'raspado') p.retangulo(x0 + 4, y0 + 3, 8, 2, C.cabeloEsc);
    else if (t === 'cacheado') { p.retangulo(x0 + 2, y0 + 1, 12, 4, C.cabelo); for (const k of [3, 6, 9, 12]) p.ponto(x0 + k, y0 + 1, C.cabeloClaro); p.retangulo(x0 + 2, y0 + 4, 2, 4, C.cabelo); p.retangulo(x0 + 12, y0 + 4, 2, 4, C.cabeloEsc); }
    const b = E.barba;
    if (b === 'curta') p.retangulo(x0 + 5, y0 + 10, 6, 2, C.cabeloEsc); else if (b === 'cheia') { p.retangulo(x0 + 4, y0 + 9, 8, 4, C.cabelo); p.retangulo(x0 + 8, y0 + 11, 2, 1, C.peleSombra); }
    else if (b === 'bigode') p.retangulo(x0 + 7, y0 + 10, 4, 1, C.cabeloEsc); else if (b === 'cavanhaque') p.retangulo(x0 + 7, y0 + 11, 3, 2, C.cabeloEsc);
  } else {
    if (t === 'longo') { p.retangulo(x0 + 3, y0 + 2, 10, 13, C.cabelo); p.retangulo(x0 + 4, y0 + 1, 8, 2, C.cabeloClaro); p.retangulo(x0 + 5, y0 + 4, 2, 9, C.cabeloClaro);
      p.retangulo(x0 + 4, y0 + 15, 8, 3, C.cabeloEsc); }
    else if (t === 'curto' || t === 'medio') { p.retangulo(x0 + 3, y0 + 2, 10, t === 'medio' ? 10 : 8, C.cabelo); p.retangulo(x0 + 4, y0 + 1, 8, 2, C.cabeloClaro); }
    else if (t === 'raspado') p.retangulo(x0 + 4, y0 + 3, 8, 7, C.cabeloEsc);
    else if (t === 'cacheado') { p.retangulo(x0 + 2, y0 + 1, 12, 10, C.cabelo); for (const k of [3, 6, 9, 12]) p.ponto(x0 + k, y0 + 3, C.cabeloClaro); }
  }
  p.contornar(); return p;
}
// A cabeça no travesseiro (dormindo): só o rosto e o cabelo, a coberta da cama faz o resto.
function cabecaDormindo() { const p = new Pincel(12, 10); p.retangulo(2, 2, 8, 7, PAL.pele); p.retangulo(1, 1, 10, 3, PAL.cabelo); p.retangulo(1, 3, 2, 6, PAL.cabelo); p.retangulo(5, 6, 2, 1, PAL.cabeloEsc); p.retangulo(8, 6, 1, 1, PAL.cabeloEsc); p.contornar(); return p; }
function gato(quadro) {
  const p = new Pincel(20, 16); const C = PAL;
  if (quadro === 'dormindo') { p.retangulo(4, 8, 12, 6, C.gato); p.retangulo(5, 9, 10, 2, C.gatoClaro); p.retangulo(12, 6, 5, 5, C.gato); p.ponto(13, 5, C.gatoEsc); p.ponto(16, 5, C.gatoEsc); p.retangulo(13, 8, 3, 1, C.gatoEsc); p.retangulo(2, 12, 4, 2, C.gatoEsc); p.contornar(); return p; }
  const a = quadro === 'andando1' ? 1 : quadro === 'andando2' ? -1 : 0;
  p.retangulo(4, 7, 10, 5, C.gato); p.retangulo(5, 8, 3, 1, C.gatoEsc); p.retangulo(9, 8, 2, 1, C.gatoEsc);
  p.retangulo(5 + a, 12, 2, 3, C.gato); p.retangulo(11 - a, 12, 2, 3, C.gato);
  p.retangulo(12, 3, 6, 6, C.gato); p.ponto(12, 2, C.gato); p.ponto(17, 2, C.gato); p.ponto(14, 5, C.preto); p.ponto(16, 5, C.preto); p.ponto(15, 7, C.rosaClaro);
  p.retangulo(1, 5 - a, 3, 2, C.gatoEsc); p.retangulo(2, 7, 2, 2, C.gato);
  p.contornar(); return p;
}
// O Jean (DEC-176): a mesma pessoa de pixel, com a aparência que ele escolhe (listas fechadas, como no servidor).
export const APARENCIA = {
  pele: ['#f6d3b8', '#f2c3a0', '#d9a27a', '#a9714d', '#6e4630'],
  cabelo: { curto: 'Curto', raspado: 'Raspado', medio: 'Médio', cacheado: 'Cacheado', careca: 'Careca' },
  cor_cabelo: { preto: '#2a1f24', castanho: '#5a3a26', loiro: '#d9b45a', ruivo: '#9c3f22', grisalho: '#a9a4b3' },
  barba: { nenhuma: 'Sem barba', curta: 'Curta', cheia: 'Cheia', bigode: 'Bigode', cavanhaque: 'Cavanhaque' },
  camisa: { azul: '#3b6fb5', verde: '#2f6b55', vinho: '#6e2a3a', preta: '#2a2633', branca: '#e8e4ec', amarela: '#e0b440' },
  calca: { jeans: '#3b4f8f', preta: '#2a2633', bege: '#c9b08a', cinza: '#6f6a7a' },
  sapato: { branco: '#e8e4ec', preto: '#1a1424', marrom: '#6e4630' },
};
export function estiloJean(ap = {}) {
  const A = APARENCIA; const pele = A.pele[ap.pele] || A.pele[1]; const cab = A.cor_cabelo[ap.cor_cabelo] || A.cor_cabelo.castanho;
  const cam = A.camisa[ap.camisa] || A.camisa.azul; const cal = A.calca[ap.calca] || A.calca.jeans;
  return { pele, peleSombra: escuro(pele, 0.15), cabelo: cab, cabeloClaro: claro(cab, 0.2), cabeloEsc: escuro(cab, 0.25), blusa: cam, blusaClara: claro(cam, 0.2), calca: cal, calcaEsc: escuro(cal, 0.2),
    sapato: A.sapato[ap.sapato] || A.sapato.branco, tipo: A.cabelo[ap.cabelo] ? ap.cabelo : 'curto', barba: A.barba[ap.barba] ? ap.barba : 'nenhuma', boca: escuro(pele, 0.3) };
}
export function jean(ap) {
  const E = estiloJean(ap); const s = {};
  for (const lado of ['frente', 'costas']) {
    for (const pose of ['parada', 'sentada']) { const p = pessoa(lado, 0, pose, E); s[`jean-${lado}-${pose}`] = p; s[`jean-${lado}-${pose}-esp`] = p.espelhar(); }
    for (let q = 0; q < 4; q++) { const p = pessoa(lado, q, 'andando', E); s[`jean-${lado}-andando${q}`] = p; s[`jean-${lado}-andando${q}-esp`] = p.espelhar(); }
  }
  return s;
}
// Os balões em cima da cabeça.
function balao(tipo) {
  const p = new Pincel(14, 14); p.retangulo(1, 1, 12, 10, PAL.creme); p.retangulo(5, 11, 3, 2, PAL.creme);
  const C = PAL; const d = {
    zzz: () => { p.retangulo(4, 3, 5, 1, C.azul); p.ponto(7, 4, C.azul); p.ponto(6, 5, C.azul); p.ponto(5, 6, C.azul); p.retangulo(4, 7, 5, 1, C.azul); },
    pergunta: () => { p.retangulo(5, 3, 4, 1, C.vinho); p.ponto(8, 4, C.vinho); p.ponto(8, 5, C.vinho); p.ponto(7, 6, C.vinho); p.ponto(6, 7, C.vinho); p.ponto(6, 9, C.vinho); },
    coracao: () => { p.retangulo(3, 4, 3, 2, C.vermelho); p.retangulo(7, 4, 3, 2, C.vermelho); p.retangulo(4, 6, 5, 2, C.vermelho); p.ponto(6, 8, C.vermelho); p.ponto(6, 5, C.vermelho); },
    livro: () => { p.retangulo(3, 4, 4, 5, C.azul); p.retangulo(7, 4, 4, 5, C.azulClaro); p.retangulo(4, 5, 2, 1, C.creme); },
    notebook: () => { p.retangulo(4, 3, 6, 4, C.preto); p.retangulo(5, 4, 4, 2, C.azulClaro); p.retangulo(3, 7, 8, 2, C.cinza); },
    panela: () => { p.retangulo(3, 5, 8, 4, C.cinza); p.retangulo(2, 5, 1, 1, C.cinza); p.retangulo(11, 5, 1, 1, C.cinza); p.ponto(5, 3, C.cinzaClaro); p.ponto(8, 2, C.cinzaClaro); },
    comida: () => { p.retangulo(3, 6, 8, 3, C.creme); p.retangulo(3, 6, 8, 1, C.cinza); p.retangulo(5, 4, 4, 2, C.vermelho); },
    tv: () => { p.retangulo(3, 3, 8, 6, C.preto); p.retangulo(4, 4, 6, 4, C.azulClaro); },
    celular: () => { p.retangulo(5, 2, 4, 8, C.preto); p.retangulo(6, 3, 2, 5, C.verdeClaro); },
    musica: () => { p.retangulo(7, 2, 1, 6, C.vinho); p.retangulo(7, 2, 3, 1, C.vinho); p.retangulo(5, 7, 3, 2, C.vinho); },
    porta: () => { p.retangulo(4, 2, 6, 8, C.madeiraEsc); p.retangulo(5, 3, 4, 6, C.madeira); p.ponto(8, 6, C.amarelo); },
    susto: () => { p.retangulo(6, 2, 2, 6, C.vermelho); p.retangulo(6, 9, 2, 1, C.vermelho); },
  }[tipo]; if (d) d();
  p.contornar(); return p;
}
export const BALOES = ['zzz', 'pergunta', 'coracao', 'livro', 'notebook', 'panela', 'comida', 'tv', 'celular', 'musica', 'porta', 'susto'];

// Os detalhes do estado da casa, por cima dos itens (DEC-175): a louça, o lixo, a roupa, a cama desarrumada, a areia suja,
// o xixi fora da caixa, a ração no pote, a mosca, a gota de chuva, o floco de neve e a nota de música.
export function detalhes() {
  const s = {}; const C = PAL; const n = (w, h, f) => { const p = new Pincel(w, h); f(p); return p; };
  s.louca = n(14, 10, (p) => { for (let k = 0; k < 3; k++) { p.retangulo(1 + k * 3, 6 - k * 2, 8, 2, k % 2 ? C.creme : C.azulGelo); p.ponto(2 + k * 3, 6 - k * 2, C.cinza); } p.retangulo(9, 1, 2, 4, C.cinzaClaro); p.contornar(); });
  s.lixo = n(12, 12, (p) => { p.retangulo(2, 3, 8, 8, C.preto); p.retangulo(4, 1, 4, 2, C.preto); p.ponto(5, 5, C.cinza); p.ponto(7, 8, C.cinza); p.contornar(); });
  s.roupa = n(14, 9, (p) => { p.retangulo(1, 4, 6, 4, C.azulClaro); p.retangulo(5, 2, 6, 4, C.rosaClaro); p.retangulo(8, 5, 5, 3, C.amarelo); p.contornar(); });
  s.lencol = n(26, 12, (p) => { p.retangulo(2, 5, 20, 5, C.azulClaro); p.retangulo(6, 3, 10, 3, C.azul); p.retangulo(16, 7, 8, 3, C.creme); p.contornar(); });
  s.areia_suja = n(16, 8, (p) => { for (const [x, y] of [[3, 3], [7, 2], [10, 4], [5, 5], [12, 2]]) p.retangulo(x, y, 2, 1, C.madeiraEsc); });
  s.mancha = n(12, 6, (p) => { p.retangulo(2, 2, 8, 2, C.amarelo); p.retangulo(4, 1, 4, 4, C.amarelo); });
  s.racao = n(8, 5, (p) => { for (const [x, y] of [[1, 2], [3, 1], [5, 2], [2, 3], [4, 3]]) p.ponto(x, y, C.madeiraEsc); });
  s.mosca = n(3, 3, (p) => { p.ponto(1, 1, C.preto); p.ponto(0, 0, C.cinzaClaro); p.ponto(2, 0, C.cinzaClaro); });
  s.gota = n(1, 4, (p) => p.retangulo(0, 0, 1, 4, C.azulGelo));
  s.floco = n(3, 3, (p) => { p.ponto(1, 0, C.creme); p.ponto(0, 1, C.creme); p.ponto(1, 1, C.creme); p.ponto(2, 1, C.creme); p.ponto(1, 2, C.creme); });
  s.nota = n(5, 7, (p) => { p.retangulo(3, 0, 1, 5, C.amarelo); p.retangulo(1, 4, 3, 2, C.amarelo); p.retangulo(3, 0, 2, 1, C.amarelo); });
  return s;
}

// Todos os sprites de pessoa e de bicho, pela chave que a cena usa.
export function personagens() {
  const s = {};
  for (const lado of ['frente', 'costas']) {
    for (const pose of ['parada', 'sentada']) { const p = pessoa(lado, 0, pose); s[`pepper-${lado}-${pose}`] = p; s[`pepper-${lado}-${pose}-esp`] = p.espelhar(); }
    for (let q = 0; q < 4; q++) { const p = pessoa(lado, q, 'andando'); s[`pepper-${lado}-andando${q}`] = p; s[`pepper-${lado}-andando${q}-esp`] = p.espelhar(); }
  }
  s['pepper-dormindo'] = cabecaDormindo();
  for (const q of ['parado', 'andando1', 'andando2', 'dormindo']) { const p = gato(q); s[`gato-${q}`] = p; s[`gato-${q}-esp`] = p.espelhar(); }
  for (const b of BALOES) s['balao-' + b] = balao(b);
  return s;
}

// Uma textura macia de luz (o halo): um degradê redondo, do centro para fora.
export function halo(tam = 64) {
  const c = Object.assign(document.createElement('canvas'), { width: tam, height: tam }); const g = c.getContext('2d');
  const r = g.createRadialGradient(tam / 2, tam / 2, 0, tam / 2, tam / 2, tam / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.4, 'rgba(255,255,255,0.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, tam, tam); return c;
}
// O feixe do sol pela janela: um trapézio em degradê, suave (nunca de borda dura, referencia-oficial.md).
export function feixe(w = 96, h = 64) {
  const c = Object.assign(document.createElement('canvas'), { width: w, height: h }); const g = c.getContext('2d');
  const lin = g.createLinearGradient(0, 0, 0, h); lin.addColorStop(0, 'rgba(255,255,255,0.9)'); lin.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = lin; g.beginPath(); g.moveTo(w * 0.35, 0); g.lineTo(w * 0.65, 0); g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fill();
  g.globalCompositeOperation = 'destination-in'; const lat = g.createLinearGradient(0, 0, w, 0);
  lat.addColorStop(0, 'rgba(0,0,0,0)'); lat.addColorStop(0.3, 'rgba(0,0,0,1)'); lat.addColorStop(0.7, 'rgba(0,0,0,1)'); lat.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = lat; g.fillRect(0, 0, w, h); return c;
}
