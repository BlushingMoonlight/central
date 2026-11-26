// Central — o boneco de papel em camadas (rodada 9, parte J1; DEC-204): toda pessoa do jogo (o Jean, a Pepper, as visitas,
// as pessoas geradas) é desenhada pelas mesmas camadas, na mesma ordem e com a mesma geometria de cada quadro: o cabelo de
// trás, o corpo (a pele), a roupa de baixo, os sapatos, a roupa de cima, o rosto, a barba, o cabelo da frente e os
// acessórios. Como todas as camadas leem a mesma geometria, ficam sempre em sincronia (parada, andando, sentada, usando e
// deitada). As cores são a paleta da pessoa, trocada por código: um só jeito de desenhar, cores infinitas.
// O mecanismo é o do "Criar um Sim" e do fazendeiro do Stardew; a arte é 100% original (nada copiado).
import { Pincel, PAL, claro, escuro, mistura, hex } from './arte.js';

// ---------------------------------------------------------------- as listas (as mesmas do servidor, o 68)
export const IDADES = { crianca: 'Criança', adolescente: 'Adolescente', adulto: 'Adulto', idoso: 'Idoso' };
export const ALTURAS = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };
export const CORPOS = { magro: 'Magro', medio: 'Médio', forte: 'Forte', cheio: 'Cheio' };
export const PELES = ['#f6d3b8', '#f2c3a0', '#e3ae86', '#d9a27a', '#b9805a', '#a9714d', '#7f5236', '#5e3b27'];
export const OLHOS = { castanho: '#3a2418', preto: '#141018', verde: '#2f6b55', azul: '#3b6fb5', mel: '#8a5a1e' };
export const BOCAS = { neutra: 'Neutra', sorriso: 'Sorriso', fina: 'Fina', cheia: 'Cheia' };
export const CABELOS = { curto: 'Curto', raspado: 'Raspado', medio: 'Médio', longo: 'Longo', cacheado: 'Cacheado', coque: 'Coque', rabo: 'Rabo de cavalo', careca: 'Careca' };
export const CORES_CABELO = { preto: '#2a1f24', castanho: '#5a3a26', ruivo: '#9c3f22', acobreado: '#b5522c', loiro: '#d9b45a', grisalho: '#a9a4b3', azul: '#3b4f8f', rosa: '#c9708a' };
export const BARBAS = { nenhuma: 'Sem barba', curta: 'Curta', cheia: 'Cheia', bigode: 'Bigode', cavanhaque: 'Cavanhaque' };
export const CIMA = { camiseta: 'Camiseta', regata: 'Regata', camisa: 'Camisa', moletom: 'Moletom', vestido: 'Vestido', pijama: 'Pijama', casaco: 'Casaco', top_academia: 'Top de academia', biquini_top: 'Biquíni (cima)' };
export const BAIXO = { calca: 'Calça', bermuda: 'Bermuda', saia: 'Saia', legging: 'Legging', short: 'Short', pijama: 'Calça de pijama', biquini: 'Biquíni' };
export const SAPATOS = { tenis: 'Tênis', sapato: 'Sapato', chinelo: 'Chinelo', bota: 'Bota', descalco: 'Descalço' };
export const ACESSORIOS = { oculos: 'Óculos', bone: 'Boné', brinco: 'Brinco', relogio: 'Relógio', cachecol: 'Cachecol' };
export const OCASIOES = { casa: 'Casa', trabalho: 'Trabalho', dormir: 'Dormir', sair: 'Sair', exercicio: 'Exercício' };
export const TRACOS = { curioso: 'Curioso', calmo: 'Calmo', engracado: 'Engraçado', organizado: 'Organizado', romantico: 'Romântico', caseiro: 'Caseiro',
  aventureiro: 'Aventureiro', criativo: 'Criativo', ambicioso: 'Ambicioso', timido: 'Tímido', sociavel: 'Sociável', teimoso: 'Teimoso', carinhoso: 'Carinhoso',
  preguicoso: 'Preguiçoso', esportista: 'Esportista', nerd: 'Nerd' };
// A regra (J1): menores de 18 anos não têm nenhuma roupa sensual. O servidor recusa a mesma lista (o 68). Nenhuma pose
// do jogo é sensual (parada, andando, sentada, usando, deitada coberta), para ninguém.
export const SENSUAL = new Set(['biquini_top', 'biquini']);
export const MENOR = new Set(['crianca', 'adolescente']);
const HEXA = /^#[0-9a-f]{6}$/i;

// ---------------------------------------------------------------- o guarda-roupa padrão (por ocasião) e a aparência
const PECA = (cima, cor_cima, baixo, cor_baixo, sapato, cor_sapato) => ({ cima, cor_cima, baixo, cor_baixo, sapato, cor_sapato });
export function roupasPadrao(idade = 'adulto') {
  const crianca = MENOR.has(idade);
  return { casa: PECA('camiseta', '#3b6fb5', crianca ? 'short' : 'calca', '#3b4f8f', 'chinelo', '#6e4630'),
    trabalho: PECA('camisa', '#e8e4ec', 'calca', '#2a2633', 'sapato', '#1a1424'),
    dormir: PECA('pijama', '#a9c4e8', 'pijama', '#a9c4e8', 'descalco', '#000000'),
    sair: PECA('camiseta', '#2f6b55', 'calca', '#3b4f8f', 'tenis', '#e8e4ec'),
    exercicio: PECA(crianca ? 'camiseta' : 'regata', '#e0b440', 'bermuda', '#2a2633', 'tenis', '#e8e4ec') };
}
export const PADRAO = { v: 2, idade: 'adulto', altura: 'media', corpo: 'medio', pele: PELES[1], olhos: 'castanho', boca: 'neutra', cabelo: 'curto', cor_cabelo: CORES_CABELO.castanho,
  barba: 'nenhuma', acessorios: [], cor_acessorio: '#2a2633', tracos: [] };

// A aparência antiga (DEC-176: o tom da pele por número, as cores por nome) vira a de agora, sem perder nada.
const VELHAS = { camisa: { azul: '#3b6fb5', verde: '#2f6b55', vinho: '#6e2a3a', preta: '#2a2633', branca: '#e8e4ec', amarela: '#e0b440' },
  calca: { jeans: '#3b4f8f', preta: '#2a2633', bege: '#c9b08a', cinza: '#6f6a7a' }, sapato: { branco: '#e8e4ec', preto: '#1a1424', marrom: '#6e4630' } };
const PELES_VELHAS = ['#f6d3b8', '#f2c3a0', '#d9a27a', '#a9714d', '#6e4630'];
export function normalizar(ap = {}) {
  const a = Object.assign({}, PADRAO, { roupas: roupasPadrao(ap.idade) }, ap || {});
  if (Number.isInteger(ap.pele)) a.pele = PELES_VELHAS[ap.pele] || PELES[1];
  if (CORES_CABELO[ap.cor_cabelo]) a.cor_cabelo = CORES_CABELO[ap.cor_cabelo];
  if (!ap.roupas && (ap.camisa || ap.calca || ap.sapato)) {
    const c = VELHAS.camisa[ap.camisa] || '#3b6fb5', b = VELHAS.calca[ap.calca] || '#3b4f8f', s = VELHAS.sapato[ap.sapato] || '#e8e4ec';
    a.roupas = Object.assign(roupasPadrao(a.idade), { casa: PECA('camiseta', c, 'calca', b, 'tenis', s), sair: PECA('camiseta', c, 'calca', b, 'tenis', s) });
  }
  a.roupas = Object.assign(roupasPadrao(a.idade), a.roupas || {});
  delete a.camisa; delete a.calca; delete a.sapato; a.v = 2;
  if (!Array.isArray(a.acessorios)) a.acessorios = []; if (!Array.isArray(a.tracos)) a.tracos = [];
  return a;
}
// A conferência (a mesma regra do servidor): listas fechadas, cores em #rrggbb e o bloqueio por idade. Devolve o erro ou null.
export function conferir(ap) {
  const a = normalizar(ap); const cor = (c) => HEXA.test(String(c || ''));
  if (!IDADES[a.idade] || !ALTURAS[a.altura] || !CORPOS[a.corpo] || !BOCAS[a.boca] || !CABELOS[a.cabelo] || !BARBAS[a.barba]) return 'Aparência inválida.';
  if (!cor(a.pele) || !cor(a.cor_cabelo) || !cor(a.cor_acessorio) || !(OLHOS[a.olhos] || cor(a.olhos))) return 'Cor inválida.';
  if (a.acessorios.length > 3 || a.acessorios.some((x) => !ACESSORIOS[x])) return 'Acessório inválido.';
  if (a.tracos.length > 3 || a.tracos.some((x) => !TRACOS[x])) return 'Escolha até 3 traços.';
  if (MENOR.has(a.idade) && a.barba !== 'nenhuma') return 'Barba só para adultos.';
  for (const [oc, r] of Object.entries(a.roupas)) {
    if (!OCASIOES[oc] || !r || !CIMA[r.cima] || !BAIXO[r.baixo] || !SAPATOS[r.sapato] || ![r.cor_cima, r.cor_baixo, r.cor_sapato].every(cor)) return 'Roupa inválida.';
    if (MENOR.has(a.idade) && (SENSUAL.has(r.cima) || SENSUAL.has(r.baixo))) return 'Essa roupa não existe para essa idade.';
  }
  return null;
}

// ---------------------------------------------------------------- o acaso com semente (o mesmo resultado sempre)
export function sorteio(semente) { let x = (Number(semente) || 1) >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return (x % 100000) / 100000; }; }
const um = (r, lista) => lista[Math.floor(r() * lista.length) % lista.length];
const corAo = (r) => '#' + [0, 0, 0].map(() => Math.floor(40 + r() * 190).toString(16).padStart(2, '0')).join('');

// O botão "aleatório" e as pessoas geradas (parte E).
export function aleatoria(semente, idade) {
  const r = sorteio(semente); const id = idade || um(r, ['adulto', 'adulto', 'adolescente', 'idoso']);
  const roupas = roupasPadrao(id); for (const oc of ['casa', 'sair', 'trabalho']) { roupas[oc].cor_cima = corAo(r); roupas[oc].cor_baixo = um(r, ['#3b4f8f', '#2a2633', '#c9b08a', '#6f6a7a', corAo(r)]); }
  if (r() < 0.4 && !MENOR.has(id)) roupas.sair.cima = um(r, ['vestido', 'camisa', 'casaco']);
  const barbado = !MENOR.has(id) && r() < 0.35;
  return normalizar({ idade: id, altura: um(r, Object.keys(ALTURAS)), corpo: um(r, Object.keys(CORPOS)), pele: um(r, PELES), olhos: um(r, Object.keys(OLHOS)), boca: um(r, Object.keys(BOCAS)),
    cabelo: um(r, Object.keys(CABELOS)), cor_cabelo: id === 'idoso' ? CORES_CABELO.grisalho : um(r, Object.values(CORES_CABELO).slice(0, 6)), barba: barbado ? um(r, Object.keys(BARBAS).slice(1)) : 'nenhuma',
    acessorios: r() < 0.3 ? [um(r, Object.keys(ACESSORIOS))] : [], roupas });
}
// Os modelos prontos (um ponto de partida; tudo se muda depois).
export const MODELOS_PRONTOS = {
  'Casual': { cabelo: 'curto', cor_cabelo: CORES_CABELO.castanho, barba: 'curta', pele: PELES[2] },
  'Cabelo longo': { cabelo: 'longo', cor_cabelo: CORES_CABELO.preto, pele: PELES[4], acessorios: ['brinco'] },
  'Cacheado': { cabelo: 'cacheado', cor_cabelo: CORES_CABELO.preto, pele: PELES[6], corpo: 'forte' },
  'De óculos': { cabelo: 'medio', cor_cabelo: CORES_CABELO.loiro, pele: PELES[0], acessorios: ['oculos'], corpo: 'magro' },
  'Vovô': { idade: 'idoso', cabelo: 'careca', cor_cabelo: CORES_CABELO.grisalho, barba: 'bigode', acessorios: ['oculos'] },
};
export const modeloPronto = (nome) => normalizar(MODELOS_PRONTOS[nome] || {});

// A genética (J1, como o "brincar com a genética"): o parente herda o rosto e as cores dos dois. A pele é a mistura (com
// um pouco de sorte), os olhos e o tipo de cabelo vêm de um dos dois (o mais escuro e o cacheado pesam mais), a altura e o
// corpo puxam um dos dois. A roupa não se herda: é a padrão da idade. Serve à parte E (a Morgan parece com os pais).
const luz = (c) => { const [r, g, b] = hex(c); return 0.3 * r + 0.59 * g + 0.11 * b; };
export function herdar(pai, mae, semente, idade = 'crianca') {
  const a = normalizar(pai), b = normalizar(mae); const r = sorteio(semente);
  const olhoHex = (x) => OLHOS[x.olhos] || x.olhos;
  const escolher = (x, y, peso) => (r() < peso ? x : y);
  const olhos = escolher(luz(olhoHex(a)) <= luz(olhoHex(b)) ? a.olhos : b.olhos, luz(olhoHex(a)) <= luz(olhoHex(b)) ? b.olhos : a.olhos, 0.7);
  const cabelo = a.cabelo === 'cacheado' || b.cabelo === 'cacheado' ? escolher('cacheado', a.cabelo === 'cacheado' ? b.cabelo : a.cabelo, 0.6) : escolher(a.cabelo, b.cabelo, 0.5);
  const corCab = mistura(a.cor_cabelo === CORES_CABELO.grisalho ? CORES_CABELO.castanho : a.cor_cabelo, b.cor_cabelo === CORES_CABELO.grisalho ? CORES_CABELO.castanho : b.cor_cabelo, r() < 0.5 ? 0.25 : 0.75);
  return normalizar({ idade, altura: escolher(a.altura, b.altura, 0.5), corpo: MENOR.has(idade) ? 'medio' : escolher(a.corpo, b.corpo, 0.5), pele: mistura(a.pele, b.pele, 0.3 + r() * 0.4),
    olhos, boca: escolher(a.boca, b.boca, 0.5), cabelo: cabelo === 'careca' || cabelo === 'raspado' ? (MENOR.has(idade) ? 'curto' : cabelo) : cabelo,
    cor_cabelo: corCab, barba: 'nenhuma', acessorios: [], tracos: [] });
}

// O questionário opcional (J1, como no The Sims 4): cada resposta soma pontos a traços; sugere os 3 mais fortes.
export const QUESTIONARIO = [
  ['Um sábado livre ideal:', [['Em casa, com uma série', { caseiro: 2, calmo: 1 }], ['Uma trilha ou viagem', { aventureiro: 2, esportista: 1 }], ['Encontrar os amigos', { sociavel: 2, engracado: 1 }]]],
  ['Na bagunça da casa, você:', [['Arruma na hora', { organizado: 2 }], ['Deixa para depois', { preguicoso: 2, calmo: 1 }], ['Arruma criando um jeito novo', { criativo: 2 }]]],
  ['Numa discussão, você:', [['Não larga o osso', { teimoso: 2 }], ['Faz uma piada', { engracado: 2 }], ['Escuta e abraça', { carinhoso: 2, calmo: 1 }]]],
  ['O que mais te prende:', [['Entender como as coisas funcionam', { curioso: 2, nerd: 1 }], ['Crescer no trabalho', { ambicioso: 2 }], ['Um gesto romântico', { romantico: 2, carinhoso: 1 }]]],
  ['Numa festa com gente nova:', [['Fico no canto', { timido: 2 }], ['Puxo assunto com todo mundo', { sociavel: 2 }], ['Acho o grupo do jogo', { nerd: 2, engracado: 1 }]]],
];
export function sugerirTracos(respostas = []) {
  const pts = {}; respostas.forEach((i, k) => { const q = QUESTIONARIO[k]; const op = q && q[1][i]; if (op) for (const [t, n] of Object.entries(op[1])) pts[t] = (pts[t] || 0) + n; });
  return Object.entries(pts).sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).slice(0, 3).map(([t]) => t);
}

// A roupa do dia (J1): por algoritmo, sem IA. A ocasião pela hora, pelo que a pessoa faz e pela agenda; o frio põe o
// casaco e o cachecol para sair; o humor baixo, em casa, pede o moletom. A mesma regra está no servidor (o 68, para ela).
export function roupaDoDia(ap, { hora = 12, dormindo = false, fora = false, atividade = '', temperatura = null, humor = '' } = {}) {
  const a = normalizar(ap); const at = String(atividade || '').toLowerCase();
  const ocasiao = dormindo || (!fora && (hora >= 23 || hora < 6)) ? 'dormir' : /academia|corrida|correr|treino|yoga|pilates|esteira|exerc/.test(at) ? 'exercicio'
    : /trabalh|escrit[oó]rio|reuni[aã]o|stark/.test(at) ? 'trabalho' : fora ? 'sair' : 'casa';
  const r = { ...a.roupas[ocasiao] }; const extra = [];
  const frio = Number.isFinite(temperatura) && temperatura < 12;
  if (frio && (ocasiao === 'sair' || ocasiao === 'trabalho')) { r.cima = 'casaco'; extra.push('cachecol'); }
  if (ocasiao === 'casa' && /triste|cansad|doente|mal\b|chatead|desanim/.test(String(humor).toLowerCase())) r.cima = 'moletom';
  if (frio && ocasiao === 'casa' && r.cima === 'regata') r.cima = 'moletom';
  return { ocasiao, roupa: r, acessorios: [...new Set([...a.acessorios, ...extra])].slice(0, 3) };
}

// ---------------------------------------------------------------- a geometria de cada quadro (a mesma para todas as camadas)
export const TAM = [20, 40]; export const ORIGEM = [10 / 20, 38 / 40];
const IDADE_G = { crianca: { cab: [7, 7], T: 7, L: 4, larg: 6, braco: 5 }, adolescente: { cab: [8, 8], T: 9, L: 5, larg: 7, braco: 6 },
  adulto: { cab: [8, 9], T: 10, L: 6, larg: 8, braco: 7 }, idoso: { cab: [8, 9], T: 10, L: 6, larg: 8, braco: 7 } };
const ALT_G = { baixa: -1, media: 0, alta: 1 }; const CORPO_G = { magro: -1, medio: 0, forte: 1, cheio: 1 };
export function geometria(a, lado, quadro, pose) {
  const I = IDADE_G[a.idade] || IDADE_G.adulto; const andando = pose === 'andando';
  const passo = andando ? [0, 1, 0, -1][quadro % 4] : 0; const sobe = andando && quadro % 2 === 1 ? -1 : 0;
  const sentada = pose === 'sentada'; const L = Math.max(3, I.L + (ALT_G[a.altura] || 0)); const larg = Math.max(5, I.larg + (CORPO_G[a.corpo] || 0));
  const pe = 37 + sobe; const quadril = pe - 2 - (sentada ? 3 : L); const tTopo = quadril - I.T + 1; const cBase = tTopo - 2; const [cw, ch] = I.cab;
  const cx = 10; const tx = cx - Math.floor(larg / 2); const hx = cx - Math.floor(cw / 2);
  return { lado, pose, passo, sentada, usando: pose === 'usando', pe, quadril, tTopo, T: I.T, L: sentada ? 3 : L, larg, tx, cx, cw, ch, hx, hy: cBase - ch + 1, cBase, braco: I.braco,
    forte: a.corpo === 'forte', cheio: a.corpo === 'cheio', idoso: a.idade === 'idoso', crianca: a.idade === 'crianca' };
}

// ---------------------------------------------------------------- as camadas
function cores(a, roupa, rosto) {
  const r = roupa || a.roupas.casa; const o = OLHOS[a.olhos] || a.olhos;
  return { pele: a.pele, peleS: escuro(a.pele, 0.15), cab: a.cor_cabelo, cabC: claro(a.cor_cabelo, 0.2), cabE: escuro(a.cor_cabelo, 0.25), olho: o,
    cima: r.cor_cima, cimaC: claro(r.cor_cima, 0.2), cimaE: escuro(r.cor_cima, 0.2), baixo: r.cor_baixo, baixoE: escuro(r.cor_baixo, 0.2), sapato: r.cor_sapato, acess: a.cor_acessorio,
    boca: rosto === 'pepper' ? PAL.rosa : escuro(a.pele, 0.3), bochecha: rosto === 'pepper' ? PAL.rosaClaro : null };
}
// os braços (o mesmo cálculo para a pele e para as mangas): [x, y, w, h] de cada braço, e a mão
function bracos(g) {
  const ombro = g.forte ? 1 : 0; const y = g.tTopo + 1;
  if (g.usando) return [[g.tx - 2 - ombro, y, 2, 3], [g.tx + g.larg + ombro, y, 2, 3], [g.tx - 1, y + 3, Math.ceil(g.larg / 2) + 1, 2, 'h'], [g.cx, y + 3, Math.ceil(g.larg / 2) + 1, 2, 'h']];
  return [[g.tx - 2 - ombro, y + g.passo, 2, g.braco], [g.tx + g.larg + ombro, y - g.passo, 2, g.braco]];
}
function maos(g) { const b = bracos(g); if (g.usando) return [[g.cx - 1, g.tTopo + 4, 2, 2]]; return b.map(([x, y, , h]) => [x, y + h, 2, 2]); }
function pernas(g) {
  if (g.sentada) return [[g.cx - 3, g.quadril + 1, 3, 3], [g.cx, g.quadril + 1, 3, 3]];
  const p = g.passo; return [[g.cx - 3, g.quadril + 1 + Math.max(0, p), 3, g.L - Math.abs(p)], [g.cx, g.quadril + 1 + Math.max(0, -p), 3, g.L - Math.abs(p)]];
}
const R = (p, [x, y, w, h], c) => p.retangulo(x, y, w, h, c);

const CAMADAS = {
  cabeloTras(p, g, C, a) {
    const t = a.cabelo; const { hx, hy, cw, ch } = g; if (g.lado !== 'frente') return;
    if (t === 'longo') { p.retangulo(hx - 1, hy + 2, 2, ch + 6, C.cab); p.retangulo(hx + cw - 1, hy + 2, 2, ch + 4, C.cabE); }
    else if (t === 'cacheado') { p.retangulo(hx - 2, hy - 1, cw + 4, ch - 1, C.cab); }
    else if (t === 'rabo') p.retangulo(hx + cw, hy + 2, 2, 6, C.cabE);
    else if (t === 'coque') p.retangulo(hx + 2, hy - 3, cw - 4, 3, C.cabE);
  },
  corpo(p, g, C) {
    for (const r of pernas(g)) R(p, r, C.pele);
    for (const r of bracos(g)) R(p, r, C.pele);
    for (const r of maos(g)) R(p, r, C.pele);
    p.retangulo(g.tx, g.tTopo, g.larg, g.T, C.pele);
    p.retangulo(g.cx - 1, g.cBase + 1, 2, 2, C.peleS); // o pescoço
    p.retangulo(g.hx, g.hy, g.cw, g.ch, C.pele); p.ponto(g.hx, g.cBase, null); p.ponto(g.hx + g.cw - 1, g.cBase, null);
  },
  baixo(p, g, C, a, r) {
    const ps = pernas(g); const t = r.baixo; const [e, d] = ps;
    const cobre = (k, cor) => { const [x, y, w, h] = ps[k]; const n = t === 'bermuda' ? Math.ceil(h / 2) + 1 : t === 'short' ? 2 : t === 'biquini' ? 0 : h; if (n) p.retangulo(x, y, w, Math.min(h, n), cor); };
    if (t === 'saia') { p.retangulo(g.tx - 1, g.quadril - 1, g.larg + 2, g.sentada ? 3 : 4, C.baixo); p.retangulo(g.tx - 1, g.quadril + (g.sentada ? 1 : 2), g.larg + 2, 1, C.baixoE); return; }
    p.retangulo(g.tx, g.quadril - 1, g.larg, 2, C.baixo); // o cós
    if (t === 'biquini') { p.retangulo(g.cx - 3, g.quadril, 6, 1, C.baixo); return; }
    cobre(0, C.baixo); cobre(1, C.baixoE);
    if (t === 'pijama') for (const [x, y, w, h] of [e, d]) for (let k = 1; k < h; k += 2) p.ponto(x + 1, y + k, C.cimaC);
    if (t === 'legging') { p.ponto(e[0], e[1] + 1, C.baixoE); p.ponto(d[0] + 2, d[1] + 1, C.baixoE); }
  },
  sapatos(p, g, C, a, r) {
    const t = r.sapato; for (const [x, y, w, h] of pernas(g)) { const yb = y + h; // os pés: 2 linhas logo abaixo da perna
      if (t === 'descalco') { p.retangulo(x, yb, w, 2, C.pele); continue; }
      if (t === 'chinelo') { p.retangulo(x, yb, w, 1, C.pele); p.retangulo(x, yb + 1, w, 1, C.sapato); continue; }
      if (t === 'bota') p.retangulo(x, yb - 2, w, 2, C.sapato);
      p.retangulo(x, yb, w, 2, C.sapato); if (t === 'tenis') p.retangulo(x, yb + 1, w, 1, '#f4f0f6'); }
  },
  cima(p, g, C, a, r) {
    const t = r.cima; const { tx, tTopo, larg, T } = g; const ombro = g.forte ? 1 : 0;
    if (t === 'biquini_top') { p.retangulo(tx + 1, tTopo + 2, larg - 2, 2, C.cima); return; }
    const alto = t === 'top_academia' ? 5 : t === 'casaco' ? T + 2 : T; p.retangulo(tx - ombro, tTopo, larg + 2 * ombro, Math.min(3, alto), C.cima); p.retangulo(tx, tTopo, larg, alto, C.cima);
    if (g.cheio) p.retangulo(tx - 1, tTopo + T - 3, larg + 2, 3, t === 'top_academia' ? C.pele : C.cima);
    p.retangulo(tx + 1, tTopo + 1, Math.max(1, Math.floor(larg / 3)), alto - 2, C.cimaC); // a luz da roupa
    const manga = { camiseta: 3, regata: 0, top_academia: 0, camisa: 99, moletom: 99, pijama: 99, casaco: 99, vestido: 2 }[t] ?? 3;
    if (manga) for (const [x, y, w, h, hor] of bracos(g)) { if (hor) { if (manga === 99) p.retangulo(x, y, w - 1, h, C.cimaE); continue; } p.retangulo(x, y, w, Math.min(h, manga), C.cima); }
    if (t === 'regata') { p.ponto(tx, tTopo, null); p.ponto(tx + larg - 1, tTopo, null); p.retangulo(tx, tTopo, 1, 1, C.pele); p.retangulo(tx + larg - 1, tTopo, 1, 1, C.pele); }
    if (t === 'camisa' && g.lado === 'frente') { p.ponto(g.cx - 1, tTopo, C.cimaC); p.ponto(g.cx, tTopo, C.cimaC); for (let k = 2; k < T - 1; k += 2) p.ponto(g.cx, tTopo + k, C.cimaE); }
    if (t === 'moletom') { p.retangulo(g.cx - 2, tTopo + T - 4, 4, 2, C.cimaE); if (g.lado !== 'frente') p.retangulo(g.cx - 2, tTopo - 1, 4, 2, C.cimaE); }
    if (t === 'casaco' && g.lado === 'frente') p.retangulo(g.cx - 1, tTopo + 1, 1, T + 1, C.cimaE);
    if (t === 'pijama') for (let k = 2; k < T; k += 3) p.ponto(tx + larg - 2, tTopo + k, C.cimaC);
    if (t === 'vestido') { p.retangulo(tx - 1, g.quadril - 1, larg + 2, g.sentada ? 3 : 5, C.cima); p.retangulo(tx - 1, g.quadril + (g.sentada ? 1 : 3), larg + 2, 1, C.cimaE); }
  },
  rosto(p, g, C, a) {
    if (g.lado !== 'frente') return; const { hx, hy, cw } = g; const yo = hy + Math.floor(g.ch / 2);
    p.ponto(hx + 2, yo, C.olho); p.ponto(hx + cw - 3, yo, C.olho);
    if (C.bochecha) { p.ponto(hx + 1, yo + 2, C.bochecha); p.ponto(hx + cw - 2, yo + 2, C.bochecha); }
    const yb = yo + 3; const b = a.boca;
    if (b === 'sorriso') { p.ponto(hx + 3, yb - 1, C.boca); p.retangulo(hx + 3, yb, cw - 6 > 0 ? cw - 6 : 2, 1, C.boca); p.ponto(hx + cw - 4, yb - 1, C.boca); }
    else if (b === 'cheia') p.retangulo(hx + 3, yb, Math.max(2, cw - 6), 2, C.boca);
    else if (b === 'fina') p.retangulo(hx + 3, yb, Math.max(2, cw - 5), 1, escuro(C.pele, 0.2));
    else p.retangulo(g.cx - 1, yb, 2, 1, C.boca);
    if (g.idoso) { p.ponto(hx + 1, yo - 2, C.peleS); p.ponto(hx + cw - 2, yo - 2, C.peleS); p.ponto(hx + 1, yb, C.peleS); p.ponto(hx + cw - 2, yb, C.peleS); }
  },
  barba(p, g, C, a) {
    if (g.lado !== 'frente') return; const { hx, hy, cw, ch } = g; const yb = hy + ch - 3; const b = a.barba;
    if (b === 'curta') p.retangulo(hx + 1, yb + 1, cw - 2, 2, C.cabE);
    else if (b === 'cheia') { p.retangulo(hx, yb, cw, 4, C.cab); p.retangulo(g.cx - 1, yb + 1, 2, 1, C.peleS); }
    else if (b === 'bigode') p.retangulo(g.cx - 2, yb, 4, 1, C.cabE);
    else if (b === 'cavanhaque') p.retangulo(g.cx - 1, yb + 1, 3, 2, C.cabE);
  },
  cabeloFrente(p, g, C, a) {
    const t = a.cabelo; const { hx, hy, cw, ch } = g; const fr = g.lado === 'frente';
    if (t === 'careca') return;
    if (t === 'raspado') { p.retangulo(hx, hy, cw, fr ? 2 : ch - 2, C.cabE); return; }
    p.retangulo(hx - 1, hy - 1, cw + 2, 3, C.cab); p.retangulo(hx, hy - 2, cw, 2, C.cabC); // o topo
    if (!fr) { // de costas, o cabelo cobre a cabeça
      const desce = t === 'longo' ? ch + 5 : t === 'medio' ? ch : t === 'cacheado' ? ch - 1 : ch - 2;
      p.retangulo(hx - 1, hy, cw + 2, desce, C.cab); p.retangulo(hx + 1, hy + 2, 2, desce - 4, C.cabC);
      if (t === 'rabo') p.retangulo(g.cx - 1, hy + ch - 2, 2, 6, C.cabE); if (t === 'coque') p.retangulo(g.cx - 2, hy - 3, 4, 3, C.cabE);
      if (t === 'cacheado') for (let k = 0; k < cw; k += 3) p.ponto(hx + k, hy + 1, C.cabC); return; }
    if (t === 'longo' || t === 'medio') { p.retangulo(hx - 1, hy + 1, 2, t === 'longo' ? ch + 3 : ch - 2, C.cab); p.retangulo(hx + cw - 1, hy + 1, 2, t === 'longo' ? ch : ch - 3, C.cabE); p.retangulo(hx + 2, hy + 1, cw - 4, 1, C.cab); }
    else if (t === 'cacheado') { p.retangulo(hx - 2, hy - 2, cw + 4, 4, C.cab); for (let k = 0; k <= cw; k += 3) p.ponto(hx - 1 + k, hy - 2, C.cabC); p.retangulo(hx - 2, hy + 2, 2, 4, C.cab); p.retangulo(hx + cw, hy + 2, 2, 4, C.cabE); }
    else { p.retangulo(hx - 1, hy + 1, 1, 3, C.cab); p.retangulo(hx + cw, hy + 1, 1, 3, C.cabE); } // curto, coque, rabo
  },
  acessorios(p, g, C, a, r, extra) {
    const lista = extra || a.acessorios; const { hx, hy, cw, ch } = g; const fr = g.lado === 'frente'; const yo = hy + Math.floor(ch / 2);
    for (const k of lista) {
      if (k === 'oculos' && fr) { p.retangulo(hx + 1, yo, 3, 1, C.acess); p.retangulo(hx + cw - 4, yo, 3, 1, C.acess); p.ponto(hx + 2, yo, mistura(C.acess, '#9fd3ff', 0.6)); p.ponto(hx + cw - 3, yo, mistura(C.acess, '#9fd3ff', 0.6)); }
      if (k === 'bone') { p.retangulo(hx - 1, hy - 2, cw + 2, 3, C.acess); if (fr) p.retangulo(hx + 1, hy + 1, cw, 1, escuro(C.acess, 0.3)); }
      if (k === 'brinco' && fr) p.ponto(hx - 1, yo + 2, PAL.amarelo);
      if (k === 'relogio') { const m = maos(g)[0]; p.ponto(m[0], m[1] - 1, C.acess); }
      if (k === 'cachecol') { p.retangulo(g.tx, g.tTopo - 1, g.larg, 2, C.acess); if (fr) p.retangulo(g.tx + 1, g.tTopo + 1, 2, 3, C.acess); }
    }
  },
};
export const ORDEM = ['cabeloTras', 'corpo', 'baixo', 'sapatos', 'cima', 'rosto', 'barba', 'cabeloFrente', 'acessorios'];

// Uma pessoa num quadro. "so": desenhar só algumas camadas (o teste de sincronia e o criador, que realça a parte tocada).
export function desenhar(ap, lado, quadro, pose, { roupa, acessorios, rosto, so } = {}) {
  const a = normalizar(ap); const g = geometria(a, lado, quadro, pose); const r = roupa || a.roupas.casa; const C = cores(a, r, rosto);
  const p = new Pincel(TAM[0], TAM[1]);
  for (const k of ORDEM) if (!so || so.includes(k)) CAMADAS[k](p, g, C, a, r, acessorios);
  p.contornar(); return p;
}
// A cabeça no travesseiro (a pose "deitada": a coberta da cama faz o resto, como a dela).
export function cabeca(ap, { rosto } = {}) {
  const a = normalizar(ap); const C = cores(a, null, rosto); const p = new Pincel(14, 12);
  p.retangulo(3, 3, 8, 7, C.pele);
  if (a.cabelo !== 'careca') { p.retangulo(2, 2, 10, 3, C.cab); p.retangulo(2, 4, 2, a.cabelo === 'longo' || a.cabelo === 'cacheado' ? 7 : 4, C.cab); if (a.cabelo === 'longo') p.retangulo(10, 4, 2, 7, C.cabE); }
  p.retangulo(5, 7, 2, 1, escuro(C.pele, 0.4)); p.retangulo(8, 7, 2, 1, escuro(C.pele, 0.4)); // os olhos fechados
  p.contornar(); return p;
}
export const POSES = ['parada', 'sentada', 'usando'];
// Todos os quadros de uma pessoa, pela chave da cena: `${prefixo}-${lado}-${pose}` (e -andandoN, -esp, -deitada).
export function quadros(prefixo, ap, opcoes = {}) {
  const s = {};
  for (const lado of ['frente', 'costas']) {
    for (const pose of POSES) { const p = desenhar(ap, lado, 0, pose, opcoes); s[`${prefixo}-${lado}-${pose}`] = p; s[`${prefixo}-${lado}-${pose}-esp`] = p.espelhar(); }
    for (let q = 0; q < 4; q++) { const p = desenhar(ap, lado, q, 'andando', opcoes); s[`${prefixo}-${lado}-andando${q}`] = p; s[`${prefixo}-${lado}-andando${q}-esp`] = p.espelhar(); }
  }
  s[`${prefixo}-deitada`] = cabeca(ap, opcoes);
  return s;
}

// ---------------------------------------------------------------- a Pepper (o rosto é fixo e não lembra ninguém real)
// Dela, só mudam o guarda-roupa e o cabelo (J1). O guarda-roupa padrão é este; as roupas de verdade vêm das lojas (parte D).
export const PEPPER = normalizar({ idade: 'adulto', altura: 'media', corpo: 'magro', pele: PAL.pele, olhos: 'verde', boca: 'neutra', cabelo: 'longo', cor_cabelo: PAL.cabelo, barba: 'nenhuma',
  roupas: { casa: PECA('camiseta', PAL.blusa, 'calca', PAL.calca, 'chinelo', PAL.vinho), trabalho: PECA('camisa', '#e8e4ec', 'saia', '#2a2633', 'sapato', PAL.vinho),
    dormir: PECA('pijama', PAL.rosaClaro, 'pijama', PAL.rosaClaro, 'descalco', '#000000'), sair: PECA('casaco', PAL.caramelo, 'calca', PAL.calca, 'bota', PAL.madeiraEsc),
    exercicio: PECA('top_academia', PAL.azulClaro, 'legging', '#2a2633', 'tenis', '#e8e4ec') } });
export function pepper(veste = {}) {
  const ap = normalizar({ ...PEPPER, ...(veste.cabelo && CABELOS[veste.cabelo] ? { cabelo: veste.cabelo } : {}), ...(veste.cor_cabelo && HEXA.test(veste.cor_cabelo) ? { cor_cabelo: veste.cor_cabelo } : {}) });
  return quadros('pepper', ap, { ...vestir(ap, veste), rosto: 'pepper' });
}
// A roupa que a cena desenha: a da ocasião (do guarda-roupa, ou a que o servidor mandou), com o que o dia troca (o casaco
// no frio, o moletom no dia ruim) e os acessórios de sempre mais os do dia (o cachecol), no máximo 3.
export function vestir(ap, veste = {}) {
  const a = normalizar(ap); const oc = OCASIOES[veste.ocasiao] ? veste.ocasiao : 'casa';
  const base = veste.roupa && CIMA[veste.roupa.cima] ? veste.roupa : a.roupas[oc]; const troca = veste.troca && typeof veste.troca === 'object' ? veste.troca : {};
  const roupa = { ...base, ...(CIMA[troca.cima] ? { cima: troca.cima } : {}) };
  return { roupa, acessorios: [...new Set([...a.acessorios, ...(Array.isArray(veste.acessorios) ? veste.acessorios : [])])].filter((x) => ACESSORIOS[x]).slice(0, 3) };
}
// As visitas: duas aparências genéricas (ninguém de verdade), só para ver quem chegou.
export const VISITAS = [normalizar({ pele: PELES[5], cabelo: 'cacheado', cor_cabelo: CORES_CABELO.preto, roupas: { casa: PECA('camiseta', '#6e2a3a', 'calca', '#2a2633', 'sapato', '#1a1424') } }),
  normalizar({ pele: PELES[0], cabelo: 'medio', cor_cabelo: CORES_CABELO.loiro, corpo: 'cheio', roupas: { casa: PECA('vestido', '#e0b440', 'calca', '#c9b08a', 'sapato', '#6e4630') } })];
