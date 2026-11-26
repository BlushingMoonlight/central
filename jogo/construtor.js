// Central — o construtor de ambientes (DEC-170, DEC-176; controles-e-construtor.md): desenhar cômodos arrastando, levantar
// e apagar paredes (as da frente ficam baixas sozinhas), pisos e cores, portas, janelas e passagens, a saída para a rua,
// andares e escada, itens do catálogo, mover, luzes ligadas a um interruptor, desfazer, refazer e salvar. Tudo é dado: o
// mapa vai inteiro ao servidor (o 68), que confere as regras antes de salvar (porta que leva a algum lugar, ninguém preso,
// a escada nos dois andares, a passagem livre).
// Parte J2 (DEC-205), o modo construir do The Sims com o modo design do Animal Crossing (o mecanismo; a arte é nossa):
// arrastar o móvel com um dedo (encaixe de 1 ou de ½ bloco), girar, pôr o pequeno em cima da bancada ou da mesa, a
// ferramenta de design (troca a cor sem trocar o item), o lugar inválido em vermelho (fora do cômodo, em cima de outro
// móvel, na frente da porta, fechando a passagem), o catálogo com busca, filtro e favoritos, puxar a parede de um cômodo
// para mudar o tamanho, mover e copiar uma sala inteira, guardar a disposição de um cômodo e voltar a ela. A vida continua
// enquanto o Jean constrói. No apartamento dela (alugado, adendo 11), as paredes são do prédio: só os móveis mudam.
import { CATALOGO, NOMES, itemDoCatalogo, funcaoDe, FUNCOES_FILTRO } from './catalogo.js';
import { PISOS, CORES_PAREDE } from './arte.js';
import { grade } from './cena.js';

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const NOME_PISO = { madeira: 'Madeira', terracota: 'Terracota', carpete: 'Carpete', azulejo: 'Azulejo', piso_frio: 'Piso frio', taco: 'Taco', cimento: 'Cimento' };
const NOME_COR = { rosado: 'Rosado', azulejo: 'Azulejo', creme: 'Creme', verde: 'Verde', azul: 'Azul', cinza: 'Cinza', tijolo: 'Tijolo' };
const FERRAMENTAS = [['mao', 'Olhar e mover'], ['comodo', 'Cômodo'], ['parede', 'Parede'], ['porta', 'Porta'], ['janela', 'Janela'], ['vao', 'Passagem'], ['saida', 'Saída'],
  ['piso', 'Piso'], ['cor', 'Cor'], ['item', 'Item'], ['design', 'Design'], ['sala', 'Sala'], ['escada', 'Escada'], ['fio', 'Interruptor'], ['apagar', 'Apagar']];
// O que não mexe na estrutura (o apartamento alugado só deixa estas).
const SO_MOVEIS = new Set(['mao', 'item', 'design', 'sala', 'fio', 'apagar']);
const DICA = { mao: 'Arraste um móvel para mudar de lugar; no vazio, a câmera anda.', comodo: 'Arraste no chão para desenhar o cômodo; na borda de um cômodo, puxe para mudar o tamanho.',
  parede: 'Arraste em linha reta para levantar a parede (ela divide o cômodo).', porta: 'Toque numa parede.', janela: 'Toque numa parede.', vao: 'Toque numa parede.', saida: 'Toque numa porta para ligar à rua.',
  piso: 'Escolha o piso e toque no cômodo.', cor: 'Escolha a cor e toque no cômodo.', item: 'Escolha o item e toque no chão.', design: 'Toque num móvel para trocar a cor (o item continua o mesmo).',
  sala: 'Toque num cômodo: arraste para mover a sala inteira, ou copie, ou guarde a disposição.', escada: 'Toque no chão: a escada sobe para o andar de cima.',
  fio: 'Toque numa luz e depois no interruptor.', apagar: 'Toque no que quer apagar.' };
const CORES_DESIGN = ['#e8c9a0', '#b8475a', '#3b4f8f', '#2f6b55', '#e0b440', '#6f6a7a', '#e8e4ec', '#2a2633'];
// Os pequenos que pousam em cima, e a altura de cada superfície (as mesmas do servidor, o 68).
const SUPERFICIE = { mesa: 16, mesa_baixa: 9, criado: 12, comoda: 18, bancada: 15, mesa_jantar: 15 };
const PEQUENO = new Set(['planta_pequena', 'abajur_mesa', 'livros', 'lava', 'monitor', 'cafeteira', 'micro_ondas', 'vasinhos', 'cesto', 'almofada', 'caneca', 'vela']);
let favoritos = []; try { favoritos = JSON.parse(localStorage.getItem('jogo-favoritos') || '[]') || []; } catch (e) { favoritos = []; }

// Só o cômodo, a parede e a sala se desenham ou arrastam; com as outras ferramentas, um dedo arrastando no vazio move a câmera.
const modoDe = (f) => (f === 'comodo' || f === 'parede' ? 'desenhar' : 'mao');
const sobrepoe = (a, b) => a.x < b.x + b.w - 0.05 && b.x < a.x + a.w - 0.05 && a.y < b.y + b.d - 0.05 && b.y < a.y + a.d - 0.05;

// As regras de lugar (J2): devolve o motivo (o lugar fica vermelho) ou null, e em cima de quê o pequeno pousou.
export function regras(m, it, x, y) {
  const n = { ...it, x, y }; const andar = it.andar || 0;
  if (it.fora) return { erro: null };
  if (n.parede) { const ok = (n.parede === 'n' && Math.abs(y - Math.round(y) - 0.05) < 0.11) || (n.parede === 'w' && Math.abs(x - Math.round(x) - 0.05) < 0.11); if (!ok) return { erro: 'só na parede' }; return { erro: null }; }
  if (x < 0 || y < 0 || x + n.w > m.largura + 0.01 || y + n.d > m.fundo + 0.01) return { erro: 'fora da casa' };
  if (!n.chao && !(m.comodos || []).some((c) => (c.andar || 0) === andar && c.area[0] <= x + 0.01 && x + n.w <= c.area[2] + 0.01 && c.area[1] <= y + 0.01 && y + n.d <= c.area[3] + 0.01)) return { erro: 'atravessa uma parede' };
  for (const a of (m.aberturas || []).filter((a) => a.tipo !== 'janela' && (a.andar || 0) === andar)) {
    const porta = a.lado === 'w' ? { x: a.em[0] - 0.5, y: a.em[1], w: 1, d: a.largura } : { x: a.em[0], y: a.em[1] - 0.5, w: a.largura, d: 1 };
    if (!n.chao && sobrepoe(n, porta)) return { erro: 'na frente da porta' }; }
  if (n.chao) return { erro: null };
  let sobre = null;
  for (const o of m.itens) { if (o.id === it.id || o.chao || o.parede || o.fora || o.solto || (o.andar || 0) !== andar) continue;
    if (sobrepoe(n, o)) { if (PEQUENO.has(n.modelo) && SUPERFICIE[o.modelo] !== undefined) sobre = o; else return { erro: 'tem ' + (NOMES[o.modelo] || o.modelo).toLowerCase() + ' aí' }; } }
  return { erro: null, sobre };
}
// A passagem (o teste de alcance, como o do servidor): da porta, todo móvel de usar continua alcançável. Devolve o que ficou preso.
export function fechaPassagem(m) {
  const g = grade(m); const pt = (m.pontos || {}).porta; if (!pt) return null; const cel = (p) => [Math.floor((p.x - g.x0) * g.N), Math.floor((p.y - g.y0) * g.N)];
  const [sx, sy] = cel(pt); if (sx < 0 || sy < 0 || sx >= g.W || sy >= g.H) return null; const visto = new Uint8Array(g.W * g.H); const fila = [[sx, sy]]; visto[sy * g.W + sx] = 1;
  while (fila.length) { const [x, y] = fila.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= g.W || ny >= g.H || visto[ny * g.W + nx]) continue;
    if (!g.pode(x, y, nx, ny)) continue; visto[ny * g.W + nx] = 1; fila.push([nx, ny]); } }
  for (const it of m.itens) { if (it.fora || it.parede || (it.andar || 0) || !(it.uso || []).length) continue; const u = it.uso[0]; const [cx, cy] = cel(u); let ok = false;
    for (let y = cy - 3; y <= cy + 3 && !ok; y++) for (let x = cx - 3; x <= cx + 3 && !ok; x++) if (x >= 0 && y >= 0 && x < g.W && y < g.H && visto[y * g.W + x]) ok = true;
    if (!ok) return it.id; }
  return null;
}

export function criarConstrutor({ raiz, motor, enviar, aviso, dica }) {
  const barra = document.createElement('div'); barra.className = 'jogo__construtor'; barra.hidden = true; raiz.appendChild(barra);
  let m = null, orig = null, base = 0, andar = 0, antes = [], depois = [], ferramenta = 'mao', piso = 'madeira', cor = 'creme', modelo = 'sofa', grupo = 'Sala', escolhido = null, inicio = null, sujo = false, sair = 0;
  let meio = 1, busca = '', filtro = '', soFavoritos = false, arrasto = null, sala = null, vermelho = null;
  const copia = (o) => JSON.parse(JSON.stringify(o));
  const da = (x) => (x.andar || 0) === andar;
  const alugado = () => !!(m && m.alugado);
  const comodoEm = (x, y) => { let r = null; for (const c of m.comodos) if (da(c) && c.area[0] <= x && x < c.area[2] && c.area[1] <= y && y < c.area[3] && (!r || (c.area[2] - c.area[0]) * (c.area[3] - c.area[1]) < (r.area[2] - r.area[0]) * (r.area[3] - r.area[1]))) r = c; return r; };
  // As paredes viram pedaços de 1 bloco; a altura sai sozinha: alta no fundo da casa, baixa na frente e dentro (para ver dentro).
  function normalizar() {
    const vistos = new Map();
    for (const p of m.paredes) { const n = p.de[1] === p.para[1]; const len = n ? p.para[0] - p.de[0] : p.para[1] - p.de[1];
      for (let k = 0; k < len; k++) { const x = n ? p.de[0] + k : p.de[0], y = n ? p.de[1] : p.de[1] + k; vistos.set(`${p.andar || 0}:${n ? 'n' : 'w'}:${x}:${y}`, { x, y, n, cor: p.cor, andar: p.andar || 0 }); } }
    const vazio = (x, y, a) => !m.comodos.some((c) => (c.andar || 0) === a && c.area[0] <= x && x < c.area[2] && c.area[1] <= y && y < c.area[3]);
    m.paredes = [...vistos.values()].map((p) => ({ de: [p.x, p.y], para: p.n ? [p.x + 1, p.y] : [p.x, p.y + 1], altura: (p.n ? vazio(p.x, p.y - 1, p.andar) : vazio(p.x - 1, p.y, p.andar)) ? 'alta' : 'baixa', cor: p.cor, ...(p.andar ? { andar: p.andar } : {}) }));
  }
  const pecas = () => m.paredes.filter(da);
  function pecaPerto(x, y) { let melhor = null, d0 = 0.45;
    for (const p of pecas()) { const n = p.de[1] === p.para[1]; const d = n ? (x >= p.de[0] && x <= p.para[0] ? Math.abs(y - p.de[1]) : 9) : (y >= p.de[1] && y <= p.para[1] ? Math.abs(x - p.de[0]) : 9);
      if (d < d0) { d0 = d; melhor = { p, lado: n ? 'n' : 'w', x: n ? Math.min(p.para[0] - 1, Math.floor(x)) : p.de[0], y: n ? p.de[1] : Math.min(p.para[1] - 1, Math.floor(y)) }; } }
    return melhor; }
  const aberturaEm = (lado, x, y) => m.aberturas.find((a) => da(a) && a.lado === lado && (lado === 'n' ? a.em[1] === y && x >= a.em[0] && x < a.em[0] + a.largura : a.em[0] === x && y >= a.em[1] && y < a.em[1] + a.largura));
  const itemEm = (x, y) => [...m.itens].reverse().find((i) => da(i) && !i.fora && x >= i.x - 0.15 && x <= i.x + i.w + 0.15 && y >= i.y - 0.15 && y <= i.y + i.d + 0.15);
  function mudar(fn) { const antigo = JSON.stringify(m); const r = fn(); if (r === false) return; antes.push(antigo); if (antes.length > 60) antes.shift(); depois = []; normalizar(); sujo = true; vermelho = null; motor.fantasma(null); motor.remontar(m, andar); desenhar(); }
  const encaixe = (v) => (meio ? Math.round(v * 2) / 2 : Math.round(v)); // o encaixe na grade: de ½ em ½ bloco, ou de 1 em 1
  // Mover um item (e os lugares de usar e o que está em cima dele junto).
  function porEm(it, x, y) { const dx = x - it.x, dy = y - it.y; it.x = x; it.y = y; for (const u of it.uso || []) { u.x = Math.round((u.x + dx) * 100) / 100; u.y = Math.round((u.y + dy) * 100) / 100; }
    for (const o of m.itens) if (o.sobre === it.id) { o.x = Math.round((o.x + dx) * 100) / 100; o.y = Math.round((o.y + dy) * 100) / 100; } }
  function soltar(it, x, y) { const r = regras(m, it, x, y); if (r.erro) { aviso('Aí não: ' + r.erro + '.', 'erro'); return false; }
    porEm(it, x, y); if (r.sobre) { it.solto = true; it.z = SUPERFICIE[r.sobre.modelo]; it.sobre = r.sobre.id; } else if (it.sobre) { delete it.sobre; if (!it.parede) { it.z = 0; delete it.solto; } }
    const preso = fechaPassagem(m); if (preso) { aviso(`Assim ${(NOMES[(m.itens.find((i) => i.id === preso) || {}).modelo] || 'um móvel').toLowerCase()} fica sem passagem.`, 'erro'); return false; } return true; }
  // Girar (J2): a pegada vira (w e d trocam), o desenho espelha e os lugares de usar giram junto.
  function girar(it) { if (it.parede || it.fora) return aviso('Esse não gira.', 'erro');
    mudar(() => { const cx = it.x + it.w / 2, cy = it.y + it.d / 2; [it.w, it.d] = [it.d, it.w]; it.x = Math.round((cx - it.w / 2) * 4) / 4; it.y = Math.round((cy - it.d / 2) * 4) / 4; it.espelhado = !it.espelhado;
      for (const u of it.uso || []) { const rx = u.x - cx, ry = u.y - cy; u.x = Math.round((cx + ry) * 100) / 100; u.y = Math.round((cy + rx) * 100) / 100; if (u.dir) u.dir = { ne: 'nw', nw: 'ne', se: 'sw', sw: 'se' }[u.dir]; }
      if (regras(m, it, it.x, it.y).erro) { aviso('Girando assim não cabe.', 'erro'); return false; } }); }
  // As paredes de um cômodo (a borda), refeitas (puxar a parede e mover a sala).
  function bordas(area, cor0) { const [a, b, x1, y1] = area; const L = [];
    for (let x2 = a; x2 < x1; x2++) for (const yy of [b, y1]) L.push({ de: [x2, yy], para: [x2 + 1, yy], cor: cor0, ...(andar ? { andar } : {}) });
    for (let y2 = b; y2 < y1; y2++) for (const xx of [a, x1]) L.push({ de: [xx, y2], para: [xx, y2 + 1], cor: cor0, ...(andar ? { andar } : {}) }); return L; }
  const naBorda = (c, x, y) => { const [a, b, x1, y1] = c.area; const e = 0.3; const dentro = x > a - e && x < x1 + e && y > b - e && y < y1 + e;
    return !dentro ? null : Math.abs(x - a) < e ? 'w' : Math.abs(x - x1) < e ? 'e' : Math.abs(y - b) < e ? 'n' : Math.abs(y - y1) < e ? 's' : null; };
  const paredeDe = (c) => (pecas().find((p) => { const [a, b, x1, y1] = c.area; const n = p.de[1] === p.para[1]; return n ? (p.de[1] === b || p.de[1] === y1) && p.de[0] >= a && p.de[0] < x1 : (p.de[0] === a || p.de[0] === x1) && p.de[1] >= b && p.de[1] < y1; }) || {}).cor || cor;
  // As paredes que são só desse cômodo (as que não são borda de outro): saem quando ele muda.
  function tirarBordas(c) { const outros = m.comodos.filter((o) => o !== c && da(o)); const de = (p) => { const n = p.de[1] === p.para[1];
      return outros.some((o) => { const [a, b, x1, y1] = o.area; return n ? (p.de[1] === b || p.de[1] === y1) && p.de[0] >= a && p.de[0] < x1 : (p.de[0] === a || p.de[0] === x1) && p.de[1] >= b && p.de[1] < y1; }); };
    const [a, b, x1, y1] = c.area; m.paredes = m.paredes.filter((p) => { if (!da(p)) return true; const n = p.de[1] === p.para[1];
      const borda = n ? (p.de[1] === b || p.de[1] === y1) && p.de[0] >= a && p.de[0] < x1 : (p.de[0] === a || p.de[0] === x1) && p.de[1] >= b && p.de[1] < y1; return !borda || de(p); }); }
  function moverSala(c, dx, dy, copiar) {
    const [a, b, x1, y1] = c.area; const na = [a + dx, b + dy, x1 + dx, y1 + dy]; if (na[0] < 0 || na[1] < 0 || na[2] > 40 || na[3] > 40) return aviso('Fora da área (de 0 a 40).', 'erro');
    if (m.comodos.some((o) => o !== c && da(o) && o.area[0] < na[2] && na[0] < o.area[2] && o.area[1] < na[3] && na[1] < o.area[3])) return aviso('Ali já tem outro cômodo.', 'erro');
    mudar(() => { const dentro = (i) => da(i) && !i.fora && i.x >= a && i.x + i.w <= x1 + 0.01 && i.y >= b && i.y + i.d <= y1 + 0.01; const cor0 = paredeDe(c);
      if (copiar) { let n = 1; while (m.comodos.some((o) => o.id === c.id + '-' + n)) n++; const novo = { ...copia(c), id: c.id + '-' + n, nome: c.nome + ' ' + (n + 1), area: na };
        m.comodos.push(novo); m.paredes.push(...bordas(na, cor0)); const ids = new Set(m.itens.map((i) => i.id));
        for (const ab of m.aberturas.filter((x) => da(x) && !x.saida && (x.lado === 'n' ? (x.em[1] === b || x.em[1] === y1) && x.em[0] >= a && x.em[0] < x1 : (x.em[0] === a || x.em[0] === x1) && x.em[1] >= b && x.em[1] < y1))) {
          const em = [ab.em[0] + dx, ab.em[1] + dy]; if (!m.aberturas.some((o) => o.lado === ab.lado && o.em[0] === em[0] && o.em[1] === em[1])) m.aberturas.push({ ...copia(ab), em }); }
        for (const i of m.itens.filter(dentro)) { const k = copia(i); let q = 1; while (ids.has(i.id + '-' + q)) q++; k.id = i.id + '-' + q; ids.add(k.id); k.x += dx; k.y += dy; for (const u of k.uso || []) { u.x += dx; u.y += dy; } delete k.sobre; m.itens.push(k); } }
      else { for (const i of m.itens.filter(dentro)) { i.x += dx; i.y += dy; for (const u of i.uso || []) { u.x += dx; u.y += dy; } }
        for (const ab of m.aberturas.filter((x) => da(x) && (x.lado === 'n' ? (x.em[1] === b || x.em[1] === y1) && x.em[0] >= a && x.em[0] < x1 : (x.em[0] === a || x.em[0] === x1) && x.em[1] >= b && x.em[1] < y1))) { ab.em = [ab.em[0] + dx, ab.em[1] + dy]; }
        tirarBordas(c); c.area = na; m.paredes.push(...bordas(na, cor0)); } }); }
  // A disposição de um cômodo (J2): onde cada item estava, para voltar a ela.
  function guardarDisposicao(c) { const [a, b, x1, y1] = c.area; mudar(() => { m.disposicoes = m.disposicoes || {};
    m.disposicoes[c.id] = m.itens.filter((i) => da(i) && !i.fora && i.x + i.w / 2 >= a && i.x + i.w / 2 < x1 && i.y + i.d / 2 >= b && i.y + i.d / 2 < y1).map((i) => ({ id: i.id, x: i.x, y: i.y, ...(i.z ? { z: i.z } : {}), ...(i.espelhado ? { espelhado: true } : {}), ...(i.sobre ? { sobre: i.sobre } : {}) })); });
    aviso('A disposição de ' + c.nome + ' ficou guardada.'); }
  function voltarDisposicao(c) { const d = (m.disposicoes || {})[c.id]; if (!d) return aviso('Esse cômodo não tem disposição guardada.', 'erro');
    mudar(() => { for (const p of d) { const it = m.itens.find((i) => i.id === p.id); if (!it) continue; if (!!p.espelhado !== !!it.espelhado) { [it.w, it.d] = [it.d, it.w]; it.espelhado = !!p.espelhado; }
      porEm(it, p.x, p.y); if (p.z !== undefined) it.z = p.z; if (p.sobre) it.sobre = p.sobre; else delete it.sobre; } }); aviso('Voltou à disposição guardada.'); }

  function tocar(x, y) {
    const t = ferramenta;
    if (alugado() && !SO_MOVEIS.has(t)) return aviso('O apartamento é alugado: as paredes são do prédio.', 'erro');
    if (t === 'porta' || t === 'janela' || t === 'vao') { const p = pecaPerto(x, y); if (!p) return aviso('Toque perto de uma parede.', 'erro');
      return mudar(() => { m.aberturas = m.aberturas.filter((a) => a !== aberturaEm(p.lado, p.x, p.y)); m.aberturas.push({ tipo: t, em: [p.x, p.y], largura: 1, lado: p.lado, ...(andar ? { andar } : {}) }); }); }
    if (t === 'saida') { const p = pecaPerto(x, y); const a = p && aberturaEm(p.lado, p.x, p.y); if (!a || a.tipo !== 'porta' || andar) return aviso('Toque numa porta do térreo.', 'erro');
      return mudar(() => { if (a.saida) delete a.saida; else a.saida = { mapa: 'rua' }; }); }
    if (t === 'piso') { const c = comodoEm(Math.floor(x), Math.floor(y)); if (!c) return aviso('Toque dentro de um cômodo.', 'erro'); return mudar(() => { c.piso = piso; }); }
    if (t === 'cor') { const c = comodoEm(Math.floor(x), Math.floor(y)); if (!c) return aviso('Toque dentro de um cômodo.', 'erro'); const [a, b, x1, y1] = c.area;
      return mudar(() => { for (const p of pecas()) { const n = p.de[1] === p.para[1]; if (n ? (p.de[1] === b || p.de[1] === y1) && p.de[0] >= a && p.de[0] < x1 : (p.de[0] === a || p.de[0] === x1) && p.de[1] >= b && p.de[1] < y1) p.cor = cor; } }); }
    if (t === 'item' || t === 'escada') { const mod = t === 'escada' ? 'escada' : modelo; const ids = new Set(m.itens.map((i) => i.id));
      let px = encaixe(x), py = encaixe(y); const c = CATALOGO.find((k) => k.modelo === mod); if (!c) return;
      if (t === 'escada') { px = Math.floor(x); py = Math.floor(y); }
      if (c.parede === 'w') px = Math.round(x) + 0.05; if (c.parede === 'n') py = Math.round(y) + 0.05;
      const it = itemDoCatalogo(mod, px, py, andar, ids); const r = c.fora ? { erro: null } : regras(m, it, px, py); if (r.erro) return aviso('Aí não: ' + r.erro + '.', 'erro');
      if (r.sobre) { it.solto = true; it.z = SUPERFICIE[r.sobre.modelo]; it.sobre = r.sobre.id; } return mudar(() => { m.itens.push(it); }); }
    if (t === 'design') { const it = itemEm(x, y); if (!it) return aviso('Toque num móvel.', 'erro'); escolhido = it.id; return desenhar(); }
    if (t === 'sala') { const c = comodoEm(Math.floor(x), Math.floor(y)); sala = c ? c.id : null; if (!c) aviso('Toque dentro de um cômodo.', 'erro'); return desenhar(); }
    if (t === 'mao') { const it = itemEm(x, y); if (!escolhido) { if (!it) return; escolhido = it.id; return desenhar(); }
      const sel = m.itens.find((i) => i.id === escolhido); if (it && it.id !== escolhido) { escolhido = it.id; return desenhar(); } escolhido = null; if (!sel || it) return desenhar();
      return mudar(() => soltar(sel, sel.parede === 'w' ? sel.x : encaixe(x - sel.w / 2), sel.parede === 'n' ? sel.y : encaixe(y - sel.d / 2))); }
    if (t === 'fio') { const it = itemEm(x, y); if (!it) return aviso('Toque numa luz ou num interruptor.', 'erro');
      if (!escolhido) { if (!it.luz) return aviso('Primeiro, toque numa luz.', 'erro'); escolhido = it.id; aviso('Agora toque no interruptor.'); return desenhar(); }
      if (it.modelo !== 'interruptor') return aviso('Isso não é um interruptor.', 'erro'); const luz = m.itens.find((i) => i.id === escolhido); escolhido = null;
      return mudar(() => { luz.luz.interruptor = it.id; aviso('A luz ficou ligada a este interruptor.'); }); }
    if (t === 'apagar') {
      const it = itemEm(x, y); if (it) return mudar(() => { m.itens = m.itens.filter((i) => i !== it && i.sobre !== it.id); });
      if (alugado()) return aviso('O apartamento é alugado: as paredes são do prédio.', 'erro');
      const p = pecaPerto(x, y); if (p) { const a = aberturaEm(p.lado, p.x, p.y); if (a) return mudar(() => { m.aberturas = m.aberturas.filter((b) => b !== a); });
        return mudar(() => { m.paredes = m.paredes.filter((q) => q !== p.p); }); }
      const c = comodoEm(Math.floor(x), Math.floor(y)); if (c) return mudar(() => { m.comodos = m.comodos.filter((o) => o !== c); });
      return aviso('Nada aqui para apagar.', 'erro');
    }
  }
  // O dedo no construtor: devolve "captura" quando o arrasto é do construtor (um móvel, a borda de um cômodo, a sala), não da câmera.
  function evento(tipo, x, y) {
    if (!m) return; const t = ferramenta;
    if (tipo === 'inicio') { inicio = { x, y }; arrasto = null;
      if (t === 'mao' || t === 'item') { const it = itemEm(x, y); if (it && (t === 'mao' || it.id === escolhido)) { arrasto = { tipo: 'item', id: it.id, dx: x - it.x, dy: y - it.y }; escolhido = it.id; return 'captura'; } }
      if (t === 'sala' && sala) { const c = m.comodos.find((o) => o.id === sala); if (c && comodoEm(Math.floor(x), Math.floor(y)) === c && !alugado()) { arrasto = { tipo: 'sala', c }; return 'captura'; } }
      if (t === 'comodo' && !alugado()) { for (const c of m.comodos.filter(da)) { const lado = naBorda(c, x, y); if (lado) { arrasto = { tipo: 'borda', c, lado }; return 'captura'; } } }
      return; }
    if (tipo === 'arrastou') { inicio = null; return; } // o dedo moveu a câmera: não é toque (adendo 3)
    if (!inicio) return;
    if (arrasto && arrasto.tipo === 'item') { const it = m.itens.find((i) => i.id === arrasto.id); if (!it) return;
      const nx = it.parede === 'w' ? it.x : encaixe(x - arrasto.dx), ny = it.parede === 'n' ? it.y : encaixe(y - arrasto.dy);
      const r = regras(m, it, nx, ny); const fant = { ...it, x: nx, y: ny, z: r.sobre ? SUPERFICIE[r.sobre.modelo] : it.sobre ? 0 : it.z };
      if (tipo === 'arrasto') { motor.fantasma(fant, !!r.erro); return motor.marcar([{ tipo: 'area', area: [nx, ny, nx + it.w, ny + it.d], erro: !!r.erro }]); }
      const toque = Math.hypot(x - inicio.x, y - inicio.y) < 0.3; inicio = null; arrasto = null; motor.fantasma(null); motor.marcar([]); if (toque || Math.hypot(nx - it.x, ny - it.y) < 0.01) return desenhar();
      return mudar(() => soltar(it, nx, ny)); }
    if (arrasto && (arrasto.tipo === 'sala' || arrasto.tipo === 'borda')) { const c = arrasto.c; const dx = Math.round(x - inicio.x), dy = Math.round(y - inicio.y);
      let area = c.area.slice(); if (arrasto.tipo === 'sala') area = [area[0] + dx, area[1] + dy, area[2] + dx, area[3] + dy];
      else { const k = { w: 0, n: 1, e: 2, s: 3 }[arrasto.lado]; area[k] += k % 2 ? dy : dx; }
      const ruim = area[2] - area[0] < 1 || area[3] - area[1] < 1 || area[0] < 0 || area[1] < 0 || area[2] > 40 || area[3] > 40;
      if (tipo === 'arrasto') return motor.marcar([{ tipo: 'area', area, erro: ruim }]);
      inicio = null; const a0 = arrasto; arrasto = null; motor.marcar([]); if (!dx && !dy) return a0.tipo === 'sala' ? desenhar() : null;
      if (ruim) return aviso('Assim não cabe.', 'erro');
      if (a0.tipo === 'sala') return moverSala(c, dx, dy, false);
      // puxar a parede: o cômodo muda de tamanho e as paredes da borda se refazem (os móveis que ficariam fora não deixam)
      if (m.itens.some((i) => da(i) && !i.fora && i.x + i.w / 2 >= c.area[0] && i.x + i.w / 2 < c.area[2] && i.y + i.d / 2 >= c.area[1] && i.y + i.d / 2 < c.area[3] && !(i.x >= area[0] - 0.01 && i.y >= area[1] - 0.01 && i.x + i.w <= area[2] + 0.01 && i.y + i.d <= area[3] + 0.01)))
        return aviso('Tem móvel no caminho da parede: mude ele primeiro.', 'erro');
      const cor0 = paredeDe(c); return mudar(() => { tirarBordas(c); m.aberturas = m.aberturas.filter((ab) => !(da(ab) && (ab.lado === 'n' ? (ab.em[1] === c.area[1] || ab.em[1] === c.area[3]) && ab.em[0] >= c.area[0] && ab.em[0] < c.area[2] : (ab.em[0] === c.area[0] || ab.em[0] === c.area[2]) && ab.em[1] >= c.area[1] && ab.em[1] < c.area[3]) && !(ab.lado === 'n' ? (ab.em[1] === area[1] || ab.em[1] === area[3]) : (ab.em[0] === area[0] || ab.em[0] === area[2]))));
        c.area = area; m.paredes.push(...bordas(area, cor0)); }); }
    if (t === 'comodo' || t === 'parede') {
      if (alugado()) { if (tipo === 'fim') { inicio = null; aviso('O apartamento é alugado: as paredes são do prédio.', 'erro'); } return; }
      const f = forma(inicio, x, y);
      if (tipo === 'arrasto') return motor.marcar(f ? [f] : []);
      inicio = null; motor.marcar([]); if (!f) return;
      if (t === 'comodo') { const [a, b, x1, y1] = f.area; if (a < 0 || b < 0 || x1 > 40 || y1 > 40) return aviso('Fora da área (de 0 a 40).', 'erro');
        let n = 1; while (m.comodos.some((c) => c.id === 'comodo-' + n)) n++;
        return mudar(() => { m.comodos.push({ id: 'comodo-' + n, nome: 'Cômodo ' + n, piso, area: [a, b, x1, y1], ...(andar ? { andar } : {}) }); m.paredes.push(...bordas([a, b, x1, y1], cor)); }); }
      return mudar(() => { const [x0, y0] = f.de, [x1, y1] = f.para; const n = y0 === y1; for (let k = Math.min(n ? x0 : y0, n ? x1 : y1); k < Math.max(n ? x0 : y0, n ? x1 : y1); k++)
        m.paredes.push({ de: n ? [k, y0] : [x0, k], para: n ? [k + 1, y0] : [x0, k + 1], cor, ...(andar ? { andar } : {}) }); });
    }
    if (tipo === 'fim') { const perto = Math.hypot(x - inicio.x, y - inicio.y) < 0.4; inicio = null; if (perto) tocar(x, y); }
  }
  function forma(a, x, y) {
    if (ferramenta === 'comodo') { const x0 = Math.floor(Math.min(a.x, x)), y0 = Math.floor(Math.min(a.y, y)), x1 = Math.floor(Math.max(a.x, x)) + 1, y1 = Math.floor(Math.max(a.y, y)) + 1;
      return { tipo: 'area', area: [x0, y0, x1, y1], erro: x0 < 0 || y0 < 0 || x1 > 40 || y1 > 40 }; }
    const sx = Math.round(a.x), sy = Math.round(a.y); const hor = Math.abs(x - a.x) >= Math.abs(y - a.y);
    const ex = hor ? Math.round(x) : sx, ey = hor ? sy : Math.round(y); if (ex === sx && ey === sy) return null; return { tipo: 'linha', de: [sx, sy], para: [ex, ey] };
  }
  // O catálogo (J2): por cômodo e por função, com busca e favoritos.
  function catalogo() {
    const q = busca.trim().toLowerCase(); const lista = CATALOGO.filter((c) => c.grupo !== 'Construção' && c.modelo !== 'escada' && !(c.fora && !m.exterior) && (soFavoritos ? favoritos.includes(c.modelo) : q ? (NOMES[c.modelo] || c.modelo).toLowerCase().includes(q) : !filtro ? c.grupo === grupo : funcaoDe(c) === filtro));
    const b = (k, rot, sel) => `<button class="jogo__mini${sel ? ' jogo__celula--sel' : ''}" data-c="${esc(k)}">${esc(rot)}</button>`;
    return `<input class="jogo__busca" type="search" data-busca placeholder="Buscar no catálogo" value="${esc(busca)}" aria-label="Buscar no catálogo">`
      + '<div class="jogo__opcoes">' + [...new Set(CATALOGO.map((c) => c.grupo))].filter((g) => g !== 'Construção').map((g) => b('grupo:' + g, g, !q && !filtro && !soFavoritos && g === grupo)).join('')
      + Object.entries(FUNCOES_FILTRO).map(([k, n]) => b('filtro:' + k, n, !q && filtro === k && !soFavoritos)).join('') + b('favoritos', 'Favoritos', soFavoritos) + '</div>'
      + '<div class="jogo__opcoes">' + (lista.length ? lista.map((c) => b('modelo:' + c.modelo, (favoritos.includes(c.modelo) ? '★ ' : '') + (NOMES[c.modelo] || c.modelo), c.modelo === modelo)).join('') : '<span class="jogo__texto2">Nada encontrado.</span>')
      + b('favoritar', favoritos.includes(modelo) ? 'Tirar dos favoritos' : 'Favoritar', false) + '</div>';
  }
  function desenhar() {
    const sel = escolhido && m.itens.find((i) => i.id === escolhido);
    if (!arrasto) motor.marcar(sel ? [{ tipo: 'area', area: [sel.x, sel.y, sel.x + sel.w, sel.y + sel.d], erro: sel.id === vermelho }] : vermelho ? (() => { const v = m.itens.find((i) => i.id === vermelho); return v ? [{ tipo: 'area', area: [v.x, v.y, v.x + v.w, v.y + v.d], erro: true }] : []; })() : []);
    const b = (k, rot, extra = '') => `<button class="jogo__mini${extra}" data-c="${esc(k)}">${esc(rot)}</button>`;
    const S = (cond) => (cond ? ' jogo__celula--sel' : '');
    const c = sala && m.comodos.find((o) => o.id === sala);
    const opcoes = ferramenta === 'piso' ? PISOS.map((p) => b('piso:' + p, NOME_PISO[p], S(p === piso))).join('')
      : ferramenta === 'cor' || ferramenta === 'comodo' || ferramenta === 'parede' ? Object.keys(CORES_PAREDE).map((k) => b('cor:' + k, NOME_COR[k], S(k === cor))).join('')
      : ferramenta === 'item' ? catalogo()
      : ferramenta === 'design' ? (sel ? `<span class="jogo__texto2">${esc(NOMES[sel.modelo] || sel.modelo)}:</span>` + CORES_DESIGN.map((h) => `<button class="jogo__cor${S(sel.cor === h)}" data-c="tinta:${h}" aria-label="Cor ${h}" style="background:${h}"></button>`).join('') + b('tinta:', 'Original', S(!sel.cor)) : '')
      : ferramenta === 'sala' ? (c ? `<span class="jogo__texto2">${esc(c.nome)}:</span>` + (alugado() ? '' : b('copiar', 'Copiar ao lado')) + b('guardar', 'Guardar a disposição') + ((m.disposicoes || {})[c.id] ? b('voltar-disp', 'Voltar à disposição') : '') : '')
      : '';
    const selecao = sel && (ferramenta === 'mao' || ferramenta === 'item') ? `<div class="jogo__ferramentas"><span class="jogo__texto2">${esc(NOMES[sel.modelo] || sel.modelo)}</span>${b('girar', 'Girar')}${b('soltar', 'Tirar a seleção')}</div>` : '';
    barra.innerHTML = `<p class="jogo__texto2">${esc(alugado() ? 'O apartamento é alugado: as paredes são do prédio; os móveis, você muda. ' : '')}${esc(DICA[ferramenta])} Andar ${andar === 0 ? 'térreo' : andar}${sujo ? ' · não salvo' : ''}</p>`
      + (opcoes ? `<div class="jogo__opcoes">${opcoes}</div>` : '') + selecao
      + `<div class="jogo__ferramentas">${FERRAMENTAS.filter(([k]) => !alugado() || SO_MOVEIS.has(k)).map(([k, n]) => b('f:' + k, n, S(k === ferramenta))).join('')}</div>`
      + `<div class="jogo__ferramentas">${b('grade', meio ? 'Encaixe ½' : 'Encaixe 1')}${alugado() ? '' : b('andar:-', 'Andar abaixo') + b('andar:+', 'Andar acima')}${b('desfazer', 'Desfazer')}${b('refazer', 'Refazer')}${b('ver', 'Ver tudo')}${b('salvar', 'Salvar')}${b('sair', sair ? 'Sair sem salvar?' : 'Sair')}</div>`;
    const busc = barra.querySelector('[data-busca]'); if (busc && document.activeElement !== busc && busca) { /* mantém o texto */ }
  }
  barra.addEventListener('input', (e) => { const i = e.target.closest('[data-busca]'); if (!i) return; busca = i.value; soFavoritos = false; const pos = i.selectionStart; desenhar(); const n = barra.querySelector('[data-busca]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (er) { /* segue */ } } });
  barra.addEventListener('click', async (e) => {
    const k = (e.target.closest('[data-c]') || {}).dataset; if (!k || !k.c) return; const [a, v] = k.c.split(/:(.*)/s); if (a !== 'sair') sair = 0;
    if (a === 'f') { ferramenta = v; escolhido = null; sala = null; motor.construir(modoDe(v)); if (v === 'mao') dica('construir'); }
    else if (a === 'piso') piso = v; else if (a === 'cor') cor = v; else if (a === 'grupo') { grupo = v; filtro = ''; busca = ''; soFavoritos = false; modelo = (CATALOGO.find((c) => c.grupo === v) || {}).modelo || modelo; }
    else if (a === 'filtro') { filtro = v; busca = ''; soFavoritos = false; } else if (a === 'favoritos') { soFavoritos = !soFavoritos; busca = ''; }
    else if (a === 'favoritar') { favoritos = favoritos.includes(modelo) ? favoritos.filter((x) => x !== modelo) : [...favoritos, modelo]; try { localStorage.setItem('jogo-favoritos', JSON.stringify(favoritos)); } catch (er) { /* segue */ } }
    else if (a === 'modelo') modelo = v;
    else if (a === 'grade') meio = meio ? 0 : 1;
    else if (a === 'girar') { const it = m.itens.find((i) => i.id === escolhido); if (it) return girar(it); }
    else if (a === 'soltar') escolhido = null;
    else if (a === 'tinta') { const it = m.itens.find((i) => i.id === escolhido); if (it) return mudar(() => { if (v) it.cor = v; else delete it.cor; }); }
    else if (a === 'copiar') { const c = m.comodos.find((o) => o.id === sala); if (c) { const w = c.area[2] - c.area[0]; return moverSala(c, w, 0, true); } }
    else if (a === 'guardar') { const c = m.comodos.find((o) => o.id === sala); if (c) return guardarDisposicao(c); }
    else if (a === 'voltar-disp') { const c = m.comodos.find((o) => o.id === sala); if (c) return voltarDisposicao(c); }
    else if (a === 'andar') { const n = Math.max(0, Math.min(3, andar + (v === '+' ? 1 : -1))); if (n !== andar) { andar = n; motor.remontar(m, andar); } }
    else if (a === 'desfazer' || a === 'refazer') { const de = a === 'desfazer' ? antes : depois, para = a === 'desfazer' ? depois : antes; if (!de.length) return aviso('Nada para ' + a + '.');
      para.push(JSON.stringify(m)); m = JSON.parse(de.pop()); sujo = true; escolhido = null; motor.remontar(m, andar); }
    else if (a === 'ver') motor.verTudo();
    else if (a === 'salvar') { const r = await enviar({ acao: 'construir', valor: { mapa: m, base } }); if (!r) return;
      if (r.ok === false) { vermelho = r.bloqueia || null; desenhar(); return aviso(r.erro || 'Não deu para salvar.', 'erro'); }
      if (r.mapa) { m = copia(r.mapa); base = r.mapa.versao; } orig = copia(m); sujo = false; vermelho = null; antes = []; depois = []; aviso('Salvo.'); }
    else if (a === 'sair') { if (sujo && !sair) { sair = 1; return desenhar(); } return fechar(); }
    desenhar();
  });
  function abrir() { m = copia(motor.mapa()); base = m.versao; andar = motor.andarVisto(); antes = []; depois = []; sujo = false; sair = 0; escolhido = null; sala = null; vermelho = null; arrasto = null;
    ferramenta = alugado() ? 'mao' : 'comodo'; orig = copia(m); normalizar(); barra.hidden = false; motor.construir(modoDe(ferramenta)); motor.remontar(m, andar); desenhar(); dica('construir'); }
  function fechar() { barra.hidden = true; motor.fantasma(null); motor.construir(null); if (sujo) aviso('Saiu sem salvar.'); motor.remontar(orig, 0); m = null; sujo = false; }
  return { abrir, fechar, evento, aberto: () => !barra.hidden, estado: () => (m ? { mapa: m, ferramenta, escolhido, sala, sujo } : null), regras: (it, x, y) => regras(m, it, x, y) };
}
