// Central — a criação de personagem (rodada 9, parte J1; DEC-204), como o "Criar um Sim", em pixel art: mexer direto no
// boneco (tocar no cabelo, no rosto ou na roupa abre só as opções daquela parte), o corpo (3 alturas, 4 tipos, 4 idades),
// as cores por troca de paleta (as prontas e a livre), o guarda-roupa por ocasião, os acessórios, a personalidade (os
// traços e o questionário opcional que sugere), a genética (um parente parecido), o aleatório, os modelos prontos, o
// desfazer e o ajuste fino (tudo numa lista, para quem quiser). Abre no celular do jogo (Configurações › Seu personagem).
// Da Pepper, só o guarda-roupa e o cabelo, e só para ver: ela escolhe a roupa do dia sozinha (o rosto dela é fixo).
// A regra de idade (menores de 18 anos sem roupa sensual) vale aqui e no servidor (o 68).
import * as B from './boneco.js';

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PARTES = [['corpo', 'Corpo'], ['rosto', 'Rosto'], ['cabelo', 'Cabelo'], ['roupa', 'Roupa'], ['acessorios', 'Acessórios'], ['jeito', 'Jeito'], ['parentes', 'Parentes'], ['fino', 'Ajuste fino']];
const PALETA = ['#e8e4ec', '#2a2633', '#3b6fb5', '#2f6b55', '#6e2a3a', '#e0b440', '#c98b5b', '#b8475a', '#6f6a7a', '#a9c4e8'];
const chip = (k, rot, sel, extra = '') => `<button class="jogo__mini${sel ? ' jogo__celula--sel' : ''}" data-c="${esc(k)}"${extra}>${esc(rot)}</button>`;
const cores = (k, lista, atual) => '<div class="jogo__cores">' + lista.map((h) => `<button class="jogo__cor${String(atual).toLowerCase() === h.toLowerCase() ? ' jogo__celula--sel' : ''}" data-c="${esc(k)}:${h}" aria-label="Cor ${h}" style="background:${h}"></button>`).join('')
  + `<label class="jogo__cor jogo__cor--livre" aria-label="Outra cor"><input type="color" data-livre="${esc(k)}" value="${/^#[0-9a-f]{6}$/i.test(atual) ? atual : '#888888'}"></label></div>`;

// Desenha um quadro do boneco num <canvas> (os pixels do tamanho certo; o CSS aumenta sem borrar).
export function pintar(canvas, pincel) { if (!canvas || !pincel) return; const c = canvas.getContext('2d'); c.clearRect(0, 0, canvas.width, canvas.height); c.drawImage(pincel.pronto(), 0, 0); }

// ctx: { folha, enviar, ultimo(), aviso(t, tipo), dica(k), voltar() }
export function criarCriador(ctx) {
  const { folha } = ctx; let ap = null, antes = [], parte = 'corpo', oc = 'casa', lado = 'frente', respostas = [], parente = 1, modo = 'jean', andando = null;
  const mudar = (fn) => { antes.push(JSON.stringify(ap)); if (antes.length > 40) antes.shift(); fn(); ap = B.normalizar(ap); desenhar(); };
  const preview = () => { const cv = folha.querySelector('[data-boneco]'); if (!cv) return; const q = andando === null ? 0 : andando % 4;
    const p = modo === 'pepper' ? B.pepper(ctx.vestePepper())[`pepper-${lado}-${andando === null ? 'parada' : 'andando' + q}`]
      : B.desenhar(ap, lado, q, andando === null ? 'parada' : 'andando', { roupa: ap.roupas[oc], acessorios: ap.acessorios }); pintar(cv, p); };
  function painel(qual) {
    const a = ap; const menor = B.MENOR.has(a.idade); const r = a.roupas[oc];
    const P = {
      corpo: () => '<p class="jogo__texto2">Idade</p><div class="jogo__par">' + Object.entries(B.IDADES).map(([k, n]) => chip('idade:' + k, n, a.idade === k)).join('') + '</div>'
        + '<p class="jogo__texto2">Altura</p><div class="jogo__par">' + Object.entries(B.ALTURAS).map(([k, n]) => chip('altura:' + k, n, a.altura === k)).join('') + '</div>'
        + '<p class="jogo__texto2">Corpo</p><div class="jogo__par">' + Object.entries(B.CORPOS).map(([k, n]) => chip('corpo:' + k, n, a.corpo === k)).join('') + '</div>',
      rosto: () => '<p class="jogo__texto2">Pele</p>' + cores('pele', B.PELES, a.pele)
        + '<p class="jogo__texto2">Olhos</p><div class="jogo__par">' + Object.keys(B.OLHOS).map((k) => chip('olhos:' + k, k[0].toUpperCase() + k.slice(1), a.olhos === k)).join('') + '</div>'
        + '<p class="jogo__texto2">Boca</p><div class="jogo__par">' + Object.entries(B.BOCAS).map(([k, n]) => chip('boca:' + k, n, a.boca === k)).join('') + '</div>'
        + (menor ? '' : '<p class="jogo__texto2">Barba</p><div class="jogo__par">' + Object.entries(B.BARBAS).map(([k, n]) => chip('barba:' + k, n, a.barba === k)).join('') + '</div>'),
      cabelo: () => '<p class="jogo__texto2">Cabelo</p><div class="jogo__par">' + Object.entries(B.CABELOS).map(([k, n]) => chip('cabelo:' + k, n, a.cabelo === k)).join('') + '</div>'
        + '<p class="jogo__texto2">Cor</p>' + cores('cor_cabelo', Object.values(B.CORES_CABELO), a.cor_cabelo),
      roupa: () => '<p class="jogo__texto2">Ocasião (a roupa do dia muda sozinha pela hora e pelo que você faz)</p><div class="jogo__par">' + Object.entries(B.OCASIOES).map(([k, n]) => chip('oc:' + k, n, oc === k)).join('') + '</div>'
        + [['cima', B.CIMA, 'cor_cima', 'Em cima'], ['baixo', B.BAIXO, 'cor_baixo', 'Embaixo'], ['sapato', B.SAPATOS, 'cor_sapato', 'Nos pés']].map(([k, L, kc, rot]) =>
          `<p class="jogo__texto2" data-peca="${k}">${rot}</p><div class="jogo__par">` + Object.entries(L).filter(([m]) => !(menor && B.SENSUAL.has(m))).map(([m, n]) => chip(`peca:${k}:${m}`, n, r[k] === m)).join('') + '</div>'
            + cores('pc:' + kc, PALETA, r[kc])).join(''),
      acessorios: () => '<p class="jogo__texto2">Até 3</p><div class="jogo__par">' + Object.entries(B.ACESSORIOS).map(([k, n]) => chip('ac:' + k, n, a.acessorios.includes(k))).join('') + '</div>'
        + '<p class="jogo__texto2">Cor</p>' + cores('cor_acessorio', PALETA, a.cor_acessorio),
      jeito: () => '<p class="jogo__texto2">Traços (até 3): a personalidade de quem você cria</p><div class="jogo__par">' + Object.entries(B.TRACOS).map(([k, n]) => chip('tr:' + k, n, a.tracos.includes(k))).join('') + '</div>'
        + '<p class="jogo__texto2">Não sabe? Responda e veja a sugestão</p>' + B.QUESTIONARIO.map(([q, ops], i) => `<p class="jogo__texto">${esc(q)}</p><div class="jogo__par">` + ops.map(([t], j) => chip(`q:${i}:${j}`, t, respostas[i] === j)).join('') + '</div>').join('')
        + (respostas.filter((x) => x !== undefined).length ? `<p class="jogo__texto2">Sugestão: ${B.sugerirTracos(respostas).map((t) => B.TRACOS[t]).join(', ')}</p>` + chip('sugestao', 'Usar a sugestão', false) : ''),
      parentes: () => '<p class="jogo__texto2">Um parente parecido (a genética): herda o rosto e as cores dos dois</p><div class="jogo__parentes">'
        + '<figure><canvas class="jogo__mini-boneco" width="20" height="40" data-pai></canvas><figcaption class="jogo__texto2">Você</figcaption></figure>'
        + '<figure><canvas class="jogo__mini-boneco" width="20" height="40" data-outro></canvas><figcaption class="jogo__texto2">Outra pessoa</figcaption></figure>'
        + '<figure><canvas class="jogo__mini-boneco" width="20" height="40" data-filho></canvas><figcaption class="jogo__texto2">O filho</figcaption></figure></div>' + chip('parente', 'Outro parente', false),
    };
    if (qual === 'fino') return ['corpo', 'rosto', 'cabelo', 'roupa', 'acessorios', 'jeito'].map((k) => `<p class="jogo__titulo">${esc(PARTES.find((x) => x[0] === k)[1])}</p>` + P[k]()).join('');
    return P[qual]();
  }
  function desenhar() {
    if (modo === 'pepper') return desenharPepper();
    folha.innerHTML = '<p class="jogo__titulo">Seu personagem</p><div class="jogo__criador"><canvas class="jogo__boneco" width="20" height="40" data-boneco aria-label="O seu personagem: toque numa parte para mudar"></canvas>'
      + '<div class="jogo__par">' + chip('virar', lado === 'frente' ? 'Ver de costas' : 'Ver de frente', false) + chip('andar', andando === null ? 'Ver andando' : 'Parar', false) + chip('aleatorio', 'Aleatório', false) + chip('desfazer', 'Desfazer', false) + '</div>'
      + '<div class="jogo__par">' + Object.keys(B.MODELOS_PRONTOS).map((n) => chip('pronto:' + n, n, false)).join('') + '</div></div>'
      + '<div class="jogo__par">' + PARTES.map(([k, n]) => chip('parte:' + k, n, parte === k)).join('') + '</div><div data-painel>' + painel(parte) + '</div>'
      + '<button class="jogo__linha" data-c="salvar">Salvar</button><button class="jogo__linha" data-c="voltar">Voltar</button>';
    preview(); if (parte === 'parentes') parentes();
  }
  function parentes() { const outro = B.aleatoria(parente * 7919); const filho = B.herdar(ap, outro, parente * 104729);
    pintar(folha.querySelector('[data-pai]'), B.desenhar(ap, 'frente', 0, 'parada')); pintar(folha.querySelector('[data-outro]'), B.desenhar(outro, 'frente', 0, 'parada'));
    pintar(folha.querySelector('[data-filho]'), B.desenhar(filho, 'frente', 0, 'parada')); }
  // A Pepper: o guarda-roupa e o cabelo dela, só para ver; a roupa de hoje e por quê.
  function desenharPepper() {
    const v = ctx.vestePepper(); const hoje = B.OCASIOES[v.ocasiao] || 'Casa';
    folha.innerHTML = '<p class="jogo__titulo">O guarda-roupa dela</p><div class="jogo__criador"><canvas class="jogo__boneco" width="20" height="40" data-boneco aria-label="A Pepper com a roupa de hoje"></canvas>'
      + `<p class="jogo__texto">Hoje: ${esc(hoje)}${v.motivo ? ' (' + esc(v.motivo) + ')' : ''}</p><p class="jogo__texto2">Ela escolhe a roupa sozinha, pelo clima, pela agenda e pelo humor. Roupa nova chega das lojas.</p></div>`
      + '<div class="jogo__parentes">' + Object.entries(B.OCASIOES).map(([k, n]) => `<figure><canvas class="jogo__mini-boneco" width="20" height="40" data-oc="${k}"></canvas><figcaption class="jogo__texto2">${esc(n)}</figcaption></figure>`).join('') + '</div>'
      + '<button class="jogo__linha" data-c="voltar">Voltar</button>';
    preview(); folha.querySelectorAll('[data-oc]').forEach((c) => pintar(c, B.pepper({ ocasiao: c.dataset.oc })['pepper-frente-parada']));
  }
  // Tocar no boneco abre a parte tocada (J1: mexer direto no boneco).
  function tocouBoneco(ev) {
    const cv = ev.target.closest('[data-boneco]'); if (!cv || modo === 'pepper') return; const r = cv.getBoundingClientRect(); const y = ((ev.clientY - r.top) / r.height) * 40;
    const g = B.geometria(ap, 'frente', 0, 'parada'); let peca = null;
    if (y < g.hy + 3) parte = 'cabelo'; else if (y <= g.cBase) parte = 'rosto'; else { parte = 'roupa'; peca = y <= g.quadril ? 'cima' : y < g.pe - 1 ? 'baixo' : 'sapato'; }
    desenhar(); if (peca) { const alvo = folha.querySelector(`[data-peca="${peca}"]`); if (alvo) alvo.scrollIntoView({ block: 'center' }); }
  }
  folha.addEventListener('click', async (ev) => {
    if (!ap && modo !== 'pepper') return; if (!folha.querySelector('[data-boneco]')) return;
    if (ev.target.closest('[data-boneco]')) return tocouBoneco(ev);
    const b = ev.target.closest('[data-c]'); if (!b) return; const [k, v, w] = b.dataset.c.split(':');
    if (k === 'voltar') { pararAndar(); folha.innerHTML = ''; return ctx.voltar(); }
    if (k === 'virar') { lado = lado === 'frente' ? 'costas' : 'frente'; return desenhar(); }
    if (k === 'andar') { if (andando === null) { andando = 0; const tick = () => { if (andando === null || !folha.querySelector('[data-boneco]')) return pararAndar(); andando++; preview(); }; andar = setInterval(tick, 160); } else pararAndar(); return desenhar(); }
    if (k === 'parte') { parte = v; return desenhar(); }
    if (k === 'oc') { oc = v; return desenhar(); }
    if (k === 'desfazer') { if (!antes.length) return ctx.aviso('Nada para desfazer.'); ap = JSON.parse(antes.pop()); return desenhar(); }
    if (k === 'aleatorio') return mudar(() => { ap = { ...B.aleatoria(Date.now() % 100000, ap.idade), tracos: ap.tracos }; });
    if (k === 'pronto') return mudar(() => { ap = { ...B.modeloPronto(v), tracos: ap.tracos }; });
    if (k === 'parente') { parente++; return desenhar(); }
    if (k === 'q') { respostas[Number(v)] = Number(w); return desenhar(); }
    if (k === 'sugestao') return mudar(() => { ap.tracos = B.sugerirTracos(respostas); });
    if (k === 'tr') return mudar(() => { ap.tracos = ap.tracos.includes(v) ? ap.tracos.filter((x) => x !== v) : [...ap.tracos, v].slice(-3); });
    if (k === 'ac') return mudar(() => { ap.acessorios = ap.acessorios.includes(v) ? ap.acessorios.filter((x) => x !== v) : [...ap.acessorios, v].slice(-3); });
    if (k === 'peca') return mudar(() => { ap.roupas[oc] = { ...ap.roupas[oc], [v]: w }; });
    if (k === 'pc') return mudar(() => { ap.roupas[oc] = { ...ap.roupas[oc], [v]: w }; });
    if (k === 'idade') return mudar(() => { ap.idade = v; if (B.MENOR.has(v)) { ap.barba = 'nenhuma'; for (const r of Object.values(ap.roupas)) { if (B.SENSUAL.has(r.cima)) r.cima = 'camiseta'; if (B.SENSUAL.has(r.baixo)) r.baixo = 'short'; } } });
    if (['altura', 'corpo', 'olhos', 'boca', 'barba', 'cabelo', 'pele', 'cor_cabelo', 'cor_acessorio'].includes(k)) return mudar(() => { ap[k] = v; });
    if (k === 'salvar') { const erro = B.conferir(ap); if (erro) return ctx.aviso(erro, 'erro');
      if (await ctx.enviar({ acao: 'jean', op: 'aparencia', valor: ap })) { antes = []; ctx.aviso('Personagem salvo.'); } }
  });
  folha.addEventListener('change', (ev) => { const i = ev.target.closest('[data-livre]'); if (!i || !ap) return; const k = i.dataset.livre; const v = i.value.toLowerCase();
    if (k.startsWith('pc:')) mudar(() => { ap.roupas[oc] = { ...ap.roupas[oc], [k.slice(3)]: v }; }); else mudar(() => { ap[k] = v; }); });
  let andar = null; const pararAndar = () => { clearInterval(andar); andar = null; andando = null; };
  return {
    abrir(quem = 'jean') { modo = quem; pararAndar(); lado = 'frente'; oc = 'casa'; respostas = []; antes = [];
      ap = B.normalizar(((ctx.ultimo() || {}).jean || {}).aparencia || {}); parte = quem === 'jean' && !((ctx.ultimo() || {}).jean || {}).aparencia?.criado_em ? 'corpo' : parte; desenhar(); if (quem === 'jean') ctx.dica('criador'); },
    aberto: () => !!folha.querySelector('[data-boneco]'),
  };
}
