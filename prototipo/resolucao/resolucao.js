// Central — a comparação de resolução (rodada 9, adendo 11, item 5; a Q-JOGO-V3): a mesma cena (a sala dela à noite) em
// duas versões. À esquerda, a de hoje (a arte de verdade do jogo: o bloco de 32 x 16 e a Pepper de 20 x 40). À direita,
// uma com o dobro de detalhe (o bloco de 64 x 32 e a Pepper de 32 x 64), mais perto do Habbo: o veio da madeira, as
// costuras do sofá, a franja do tapete, a cúpula do abajur, a vista da janela e o rosto dela. As duas aparecem do mesmo
// tamanho na tela, com os pixels inteiros. Nada aqui muda o jogo: a troca só acontece se o Jean escolher.
import { piso, parede, item, PAL, mistura, claro, escuro } from '../../jogo/arte.js';
import { pepper } from '../../jogo/boneco.js';

const W = 5, D = 4; // a cena: 5 x 4 blocos, com a parede do fundo e a da esquerda
// ---------------------------------------------------------------- a versão de hoje (a arte do jogo)
function hoje() {
  const BX = 16, BY = 8; const c = Object.assign(document.createElement('canvas'), { width: 168, height: 132 }); const g = c.getContext('2d');
  const ox = 4 * BX + 8, oy = 56; const iso = (x, y, z = 0) => [ox + (x - y) * BX, oy + (x + y) * BY - z];
  const por = (p, x, y, z = 0, esp = false) => { const cv = p.pronto(); const [wx, wy] = iso(x, y, z); const [ax, ay] = p.ancora || [0.5, 1]; g.save(); if (esp) { g.translate(wx, 0); g.scale(-1, 1); g.translate(-wx, 0); } g.drawImage(cv, Math.round(wx - ax * p.w), Math.round(wy - ay * p.h)); g.restore(); };
  for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) por(piso('madeira'), x, y);
  for (let x = 0; x < W; x++) por(parede('n', 48, x === 2 ? 'janela' : 'parede', 'rosado'), x, -0.25);
  for (let y = 0; y < D; y++) por(parede('w', 48, 'parede', 'rosado'), -0.25, y);
  por(item({ modelo: 'tapete', w: 3, d: 2 }), 1, 1.6);
  por(item({ modelo: 'planta_grande', w: 0.8, d: 0.8 }), 0.2, 0.2);
  por(item({ modelo: 'sofa', w: 3, d: 1 }), 1, 0.3);
  por(item({ modelo: 'abajur_chao', w: 0.6, d: 0.6 }), 4.2, 0.3);
  const pp = pepper({ ocasiao: 'casa' })['pepper-frente-parada']; const cv = pp.pronto(); const [px, py] = iso(3.6, 2.6); g.drawImage(cv, Math.round(px - 10), Math.round(py - 38));
  return noite(c, [iso(4.5, 0.6, 40)], 70);
}
// ---------------------------------------------------------------- a versão com o dobro de detalhe
// Um pincel simples de pixels inteiros, em cima de um canvas.
function pincel(w, h) { const c = Object.assign(document.createElement('canvas'), { width: w, height: h }); const g = c.getContext('2d');
  const px = (x, y, cor) => { g.fillStyle = cor; g.fillRect(Math.round(x), Math.round(y), 1, 1); };
  const ret = (x, y, w2, h2, cor) => { g.fillStyle = cor; g.fillRect(Math.round(x), Math.round(y), Math.round(w2), Math.round(h2)); };
  const poli = (pts, cor) => { g.fillStyle = cor; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(Math.round(x), Math.round(y)) : g.moveTo(Math.round(x), Math.round(y)))); g.closePath(); g.fill(); };
  const lin = (x0, y0, x1, y1, cor) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let k = 0; k <= n; k++) px(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n, cor); };
  return { c, g, px, ret, poli, lin };
}
function dobro() {
  const BX = 32, BY = 16; const fundo = pincel(336, 264), objetos = pincel(336, 264); let P = fundo; const ox = 4 * BX + 16, oy = 112;
  const iso = (x, y, z = 0) => [ox + (x - y) * BX, oy + (x + y) * BY - z];
  const face = (pts, cor) => P.poli(pts.map((p) => iso(...p)), cor);
  // a caixa isométrica com as três faces e a aresta clara
  const caixa = (x, y, w, d, z, h, cor, topo = claro(cor, 0.18)) => {
    face([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], cor);
    face([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], escuro(cor, 0.22));
    face([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], topo);
    const a = iso(x, y + d, z + h), b = iso(x + w, y + d, z + h), c2 = iso(x + w, y, z + h); P.lin(...a, ...b, claro(topo, 0.3)); P.lin(...b, ...c2, claro(topo, 0.3)); };
  // o chão: tábuas com o veio e os pregos
  for (let y = 0; y < D; y++) for (let x = 0; x < W; x++) { face([[x, y, 0], [x + 1, y, 0], [x + 1, y + 1, 0], [x, y + 1, 0]], (x + y) % 2 ? PAL.madeira : mistura(PAL.madeira, PAL.caramelo, 0.25));
    for (let k = 1; k < 4; k++) { const a = iso(x, y + k / 4), b = iso(x + 1, y + k / 4); P.lin(...a, ...b, PAL.madeiraEsc); }
    for (let k = 0; k < 4; k++) { const v = iso(x + ((k * 37 + x * 13 + y * 7) % 10) / 10, y + k / 4 + 0.12); P.px(v[0], v[1], escuro(PAL.madeira, 0.12)); P.px(v[0] + 1, v[1], escuro(PAL.madeira, 0.12)); P.px(v[0] - 6, v[1] + 3, mistura(PAL.madeiraEsc, '#000000', 0.3)); } }
  // as paredes: o papel de parede listrado, o rodapé e a moldura no alto
  const H = 96;
  for (let x = 0; x < W; x++) { face([[x, 0, 0], [x + 1, 0, 0], [x + 1, 0, H], [x, 0, H]], PAL.parede); for (let k = 0; k < 4; k++) { const a = iso(x + k / 4 + 0.05, 0, 8), b = iso(x + k / 4 + 0.05, 0, H - 6); P.lin(...a, ...b, mistura(PAL.parede, PAL.paredeClara, 0.35)); }
    face([[x, 0, 0], [x + 1, 0, 0], [x + 1, 0, 6], [x, 0, 6]], PAL.madeiraEsc); face([[x, 0, H - 5], [x + 1, 0, H - 5], [x + 1, 0, H], [x, 0, H]], PAL.paredeClara); }
  for (let y = 0; y < D; y++) { face([[0, y, 0], [0, y + 1, 0], [0, y + 1, H], [0, y, H]], PAL.paredeEsc); for (let k = 0; k < 4; k++) { const a = iso(0, y + k / 4 + 0.05, 8), b = iso(0, y + k / 4 + 0.05, H - 6); P.lin(...a, ...b, mistura(PAL.paredeEsc, PAL.parede, 0.4)); }
    face([[0, y, 0], [0, y + 1, 0], [0, y + 1, 6], [0, y, 6]], PAL.madeiraEsc); }
  // a janela: a moldura, o vidro com a cidade à noite (os prédios, as janelas acesas, a ponte) e o reflexo
  face([[2.1, 0, 28], [2.9, 0, 28], [2.9, 0, 80], [2.1, 0, 80]], PAL.madeiraEsc);
  for (let k = 0; k <= 20; k++) for (let j = 0; j <= 44; j++) { const u = 2.16 + (k / 20) * 0.68, z = 32 + j; const [sx, sy] = iso(u, 0, z); const v = 1 - j / 44;
    let cor = mistura('#141a3a', '#2a2a55', v); const col = Math.floor(k / 3); const alto = 0.45 + ((col * 7919) % 10) / 30;
    if (v > alto) cor = (k + j) % 3 === 0 && ((k * 31 + j * 17) % 7) > 2 ? '#ffd98a' : '#2b2140'; if (Math.abs(v - 0.52) < 0.02) cor = k % 3 ? '#3a3550' : '#ffd98a'; if (v < 0.3 && ((k * 13 + j * 7) % 41) === 0) cor = '#fff4e0';
    P.ret(sx, sy, 2, 2, cor); }
  face([[2.48, 0, 32], [2.52, 0, 32], [2.52, 0, 76], [2.48, 0, 76]], PAL.madeiraEsc); face([[2.16, 0, 54], [2.84, 0, 54], [2.84, 0, 56], [2.16, 0, 56]], PAL.madeiraEsc);
  face([[2.0, 0.02, 82], [3.0, 0.02, 82], [3.0, 0.02, 84], [2.0, 0.02, 84]], PAL.madeira); face([[2.0, 0.03, 26], [3.0, 0.03, 26], [3.0, 0.03, 28], [2.0, 0.03, 28]], PAL.bege);
  // o tapete: a borda, o desenho no meio e a franja
  face([[1, 1.6, 0], [4, 1.6, 0], [4, 3.6, 0], [1, 3.6, 0]], PAL.azul); face([[1.15, 1.75, 0], [3.85, 1.75, 0], [3.85, 3.45, 0], [1.15, 3.45, 0]], PAL.telha);
  face([[1.5, 2.1, 0], [3.5, 2.1, 0], [3.5, 3.1, 0], [1.5, 3.1, 0]], PAL.azul); face([[2.2, 2.4, 0], [2.8, 2.4, 0], [2.8, 2.8, 0], [2.2, 2.8, 0]], PAL.amarelo);
  for (let k = 0; k <= 24; k++) { const [fx, fy] = iso(1 + k * 0.125, 3.6); P.ret(fx, fy, 1, 3, PAL.creme); }
  P = objetos; // daqui em diante, os móveis (com o contorno escuro de fora, como no jogo)
  // a planta: o vaso de barro com a faixa e muitas folhas
  caixa(0.25, 0.25, 0.55, 0.55, 0, 16, PAL.telha); caixa(0.25, 0.25, 0.55, 0.55, 12, 2, escuro(PAL.telha, 0.2));
  for (let k = 0; k < 90; k++) { const a = k * 2.399, r = Math.sqrt(k / 90) * 22; const [px, py] = iso(0.52, 0.52, 46); P.ret(px + Math.cos(a) * r * 1.2 - 2, py + Math.sin(a) * r * 0.9 - 1, 4, 2, k % 4 ? PAL.verde : k % 8 ? PAL.verdeClaro : PAL.verdeEsc); }
  // o sofá: a base, o encosto, os braços, as almofadas com costura e a manta
  caixa(1, 0.3, 3, 1, 0, 14, PAL.vinho); caixa(1, 0.3, 3, 0.35, 14, 22, mistura(PAL.vinho, PAL.rosa, 0.3)); caixa(1, 0.3, 0.3, 1, 14, 10, PAL.vinho); caixa(3.7, 0.3, 0.3, 1, 14, 10, PAL.vinho);
  for (const k of [0, 1, 2]) { caixa(1.32 + k * 0.8, 0.68, 0.76, 0.6, 14, 6, mistura(PAL.rosa, PAL.vinho, 0.35)); const a = iso(1.32 + k * 0.8 + 0.05, 1.27, 19), b = iso(1.32 + k * 0.8 + 0.7, 1.27, 19); P.lin(...a, ...b, escuro(PAL.rosa, 0.4)); }
  caixa(1.5, 0.66, 0.5, 0.25, 20, 10, PAL.amarelo); caixa(3.1, 0.66, 0.5, 0.25, 20, 10, PAL.verdeClaro); caixa(1.05, 0.7, 0.7, 0.62, 20, 3, PAL.verdeEsc);
  // o abajur de pé: a base, a haste, a cúpula com a textura e a luz por baixo
  caixa(4.25, 0.35, 0.5, 0.5, 0, 3, PAL.madeiraEsc); caixa(4.47, 0.57, 0.06, 0.06, 3, 60, PAL.madeiraEsc); caixa(4.15, 0.25, 0.7, 0.7, 62, 22, PAL.bege, PAL.amarelo);
  for (let k = 0; k < 6; k++) { const a = iso(4.18 + k * 0.11, 0.95, 64), b = iso(4.18 + k * 0.11, 0.95, 82); P.lin(...a, ...b, mistura(PAL.bege, PAL.caramelo, 0.3)); }
  contornar(objetos); fundo.g.drawImage(objetos.c, 0, 0); P = fundo;
  // a gata dormindo no tapete (enrolada)
  const [gx, gy] = iso(2.4, 2.7, 0); P.ret(gx - 10, gy - 8, 20, 8, PAL.gato); P.ret(gx - 8, gy - 7, 14, 3, PAL.gatoClaro); P.ret(gx + 6, gy - 11, 8, 7, PAL.gato); P.px(gx + 7, gy - 12, PAL.gatoEsc); P.px(gx + 12, gy - 12, PAL.gatoEsc);
  P.ret(gx + 8, gy - 7, 4, 1, PAL.gatoEsc); P.ret(gx - 13, gy - 4, 6, 3, PAL.gatoEsc);
  // a Pepper, 32 x 64, com o rosto detalhado (o mesmo jeito dela, nada de gente de verdade)
  const [qx, qy] = iso(3.6, 2.6); pepper2x(P, qx - 16, qy - 64);
  return noite(fundo.c, [iso(4.5, 0.6, 72)], 150);
}
// O contorno de fora: todo pixel vazio encostado num pixel pintado fica escuro.
function contornar(Q) { const { width: w, height: h } = Q.c; const d = Q.g.getImageData(0, 0, w, h).data; const cheio = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!cheio(x, y) && (cheio(x + 1, y) || cheio(x - 1, y) || cheio(x, y + 1) || cheio(x, y - 1))) Q.px(x, y, PAL.contorno); }
function pepper2x(P, x0, y0) {
  const Q = pincel(34, 66); // desenhada à parte (com 1 pixel de folga), para o contorno escuro de fora, como no jogo
  const pele = PAL.pele, ps = PAL.peleSombra, cab = PAL.cabelo, cabC = PAL.cabeloClaro, cabE = PAL.cabeloEsc, bl = PAL.blusa, blC = PAL.blusaClara, ca = PAL.calca, caE = PAL.calcaEsc;
  const R = (x, y, w, h, c) => Q.ret(x + 1, y + 1, w, h, c); const X = (x, y, c) => Q.px(x + 1, y + 1, c);
  R(6, 4, 20, 26, cab); R(8, 2, 16, 4, cabC); for (const k of [9, 13, 17, 21]) R(k, 4, 1, 22, cabE); // o cabelo de trás, com mechas
  R(10, 47, 5, 13, ca); R(17, 47, 5, 13, caE); R(10, 52, 1, 6, caE); R(10, 60, 5, 3, PAL.vinho); R(17, 60, 5, 3, PAL.vinho); // as pernas e os sapatos
  R(8, 28, 16, 20, bl); R(10, 30, 5, 16, blC); R(14, 28, 4, 3, pele); R(15, 28, 2, 4, ps); R(9, 36, 14, 1, escuro(bl, 0.2)); // a blusa com a gola e a dobra
  R(4, 29, 4, 14, bl); R(24, 29, 4, 14, bl); R(4, 43, 4, 4, pele); R(24, 43, 4, 4, pele); R(4, 40, 4, 1, escuro(bl, 0.2)); // os braços
  R(14, 24, 4, 5, ps); R(9, 8, 14, 17, pele); R(9, 22, 1, 3, ps); R(22, 22, 1, 3, ps); // o pescoço e o rosto
  R(8, 5, 16, 6, cab); R(9, 4, 14, 2, cabC); R(7, 9, 3, 18, cab); R(22, 9, 3, 15, cabE); R(12, 10, 6, 2, cab); // a franja e os lados
  R(11, 13, 3, 1, cabE); R(18, 13, 3, 1, cabE); // as sobrancelhas
  R(11, 15, 3, 3, '#fff8ec'); R(18, 15, 3, 3, '#fff8ec'); R(12, 15, 2, 3, PAL.verdeEsc); R(19, 15, 2, 3, PAL.verdeEsc); X(12, 15, '#fff8ec'); X(19, 15, '#fff8ec'); // os olhos (verdes), com o brilho
  X(16, 18, ps); X(16, 19, ps); R(15, 20, 2, 1, ps); R(10, 19, 2, 1, PAL.rosaClaro); R(20, 19, 2, 1, PAL.rosaClaro); // o nariz e as bochechas
  R(14, 22, 4, 1, PAL.rosa); R(15, 23, 2, 1, escuro(PAL.rosa, 0.2)); // a boca
  contornar(Q);
  P.g.drawImage(Q.c, Math.round(x0 - 1), Math.round(y0 - 1));
}
// A noite: o escuro por cima, com a poça de luz quente do abajur (como no jogo).
function noite(c, luzes, raio) {
  const o = Object.assign(document.createElement('canvas'), { width: c.width, height: c.height }); const g = o.getContext('2d'); g.fillStyle = 'rgba(42,26,44,0.62)'; g.fillRect(0, 0, o.width, o.height);
  g.globalCompositeOperation = 'destination-out'; for (const [x, y] of luzes) { const r = g.createRadialGradient(x, y, 0, x, y, raio); r.addColorStop(0, 'rgba(0,0,0,1)'); r.addColorStop(0.5, 'rgba(0,0,0,0.6)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, o.width, o.height); }
  const gc = c.getContext('2d'); gc.drawImage(o, 0, 0); gc.globalCompositeOperation = 'lighter';
  for (const [x, y] of luzes) { const r = gc.createRadialGradient(x, y, 0, x, y, raio * 0.8); r.addColorStop(0, 'rgba(255,194,122,0.35)'); r.addColorStop(1, 'rgba(255,194,122,0)'); gc.fillStyle = r; gc.fillRect(0, 0, c.width, c.height); }
  gc.globalCompositeOperation = 'source-over'; return c;
}
// Põe cada versão no seu quadro, no maior múltiplo inteiro que cabe (os pixels nunca borram).
export function mostrar() {
  const a = hoje(), b = dobro();
  // a escala: o maior número par que cabe (a de hoje em k vezes, a de dobro em k/2 vezes: o mesmo tamanho, pixels inteiros)
  const largura = document.querySelector('.comparacao__quadro').clientWidth || 360; const k = Math.max(2, Math.floor(largura / a.width / 2) * 2);
  for (const [sel, img, z] of [['[data-hoje]', a, k], ['[data-dobro]', b, k / 2]]) { const alvo = document.querySelector(sel); alvo.width = img.width; alvo.height = img.height; alvo.getContext('2d').drawImage(img, 0, 0);
    alvo.style.width = img.width * z + 'px'; alvo.style.height = img.height * z + 'px'; }
}
mostrar(); addEventListener('resize', mostrar);
