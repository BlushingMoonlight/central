// Central — o construtor de ambientes (DEC-170, DEC-176; controles-e-construtor.md): desenhar cômodos arrastando, levantar
// e apagar paredes (as da frente ficam baixas sozinhas), pisos e cores, portas, janelas e passagens, a saída para a rua,
// andares e escada, itens do catálogo, mover, luzes ligadas a um interruptor, desfazer, refazer e salvar. Tudo é dado: o
// mapa vai inteiro ao servidor (o 68), que confere as regras antes de salvar (porta que leva a algum lugar, ninguém preso,
// a escada nos dois andares).
import { CATALOGO, NOMES, itemDoCatalogo } from './catalogo.js';
import { PISOS, CORES_PAREDE } from './arte.js';

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const NOME_PISO = { madeira: 'Madeira', terracota: 'Terracota', carpete: 'Carpete', azulejo: 'Azulejo', piso_frio: 'Piso frio', taco: 'Taco', cimento: 'Cimento' };
const NOME_COR = { rosado: 'Rosado', azulejo: 'Azulejo', creme: 'Creme', verde: 'Verde', azul: 'Azul', cinza: 'Cinza', tijolo: 'Tijolo' };
const FERRAMENTAS = [['mao', 'Olhar'], ['comodo', 'Cômodo'], ['parede', 'Parede'], ['porta', 'Porta'], ['janela', 'Janela'], ['vao', 'Passagem'], ['saida', 'Saída'],
  ['piso', 'Piso'], ['cor', 'Cor'], ['item', 'Item'], ['mover', 'Mover'], ['escada', 'Escada'], ['fio', 'Interruptor'], ['apagar', 'Apagar']];
const DICA = { mao: 'Arraste para olhar a casa.', comodo: 'Arraste no chão para desenhar o cômodo.', parede: 'Arraste em linha reta para levantar a parede.',
  porta: 'Toque numa parede.', janela: 'Toque numa parede.', vao: 'Toque numa parede.', saida: 'Toque numa porta para ligar à rua.', piso: 'Escolha o piso e toque no cômodo.',
  cor: 'Escolha a cor e toque no cômodo.', item: 'Escolha o item e toque no chão.', mover: 'Toque no item e depois no lugar novo.', escada: 'Toque no chão: a escada sobe para o andar de cima.',
  fio: 'Toque numa luz e depois no interruptor.', apagar: 'Toque no que quer apagar.' };

// Só o cômodo e a parede se desenham arrastando; com as outras ferramentas, um dedo arrastando move a câmera (adendo 3).
const modoDe = (f) => (f === 'comodo' || f === 'parede' ? 'desenhar' : 'mao');
export function criarConstrutor({ raiz, motor, enviar, aviso }) {
  const barra = document.createElement('div'); barra.className = 'jogo__construtor'; barra.hidden = true; raiz.appendChild(barra);
  let m = null, orig = null, base = 0, andar = 0, mapaId = '', antes = [], depois = [], ferramenta = 'mao', piso = 'madeira', cor = 'creme', modelo = 'sofa', grupo = 'Sala', escolhido = null, inicio = null, sujo = false, sair = 0;
  const copia = (o) => JSON.parse(JSON.stringify(o));
  const da = (x) => (x.andar || 0) === andar;
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
  function mudar(fn) { const antigo = JSON.stringify(m); const r = fn(); if (r === false) return; antes.push(antigo); if (antes.length > 60) antes.shift(); depois = []; normalizar(); sujo = true; motor.remontar(m, andar); desenhar(); }

  function tocar(x, y) {
    const t = ferramenta;
    if (t === 'porta' || t === 'janela' || t === 'vao') { const p = pecaPerto(x, y); if (!p) return aviso('Toque perto de uma parede.', 'erro');
      return mudar(() => { m.aberturas = m.aberturas.filter((a) => a !== aberturaEm(p.lado, p.x, p.y)); m.aberturas.push({ tipo: t, em: [p.x, p.y], largura: 1, lado: p.lado, ...(andar ? { andar } : {}) }); }); }
    if (t === 'saida') { const p = pecaPerto(x, y); const a = p && aberturaEm(p.lado, p.x, p.y); if (!a || a.tipo !== 'porta' || andar) return aviso('Toque numa porta do térreo.', 'erro');
      return mudar(() => { if (a.saida) delete a.saida; else a.saida = { mapa: 'rua' }; }); }
    if (t === 'piso') { const c = comodoEm(Math.floor(x), Math.floor(y)); if (!c) return aviso('Toque dentro de um cômodo.', 'erro'); return mudar(() => { c.piso = piso; }); }
    if (t === 'cor') { const c = comodoEm(Math.floor(x), Math.floor(y)); if (!c) return aviso('Toque dentro de um cômodo.', 'erro'); const [a, b, x1, y1] = c.area;
      return mudar(() => { for (const p of pecas()) { const n = p.de[1] === p.para[1]; if (n ? (p.de[1] === b || p.de[1] === y1) && p.de[0] >= a && p.de[0] < x1 : (p.de[0] === a || p.de[0] === x1) && p.de[1] >= b && p.de[1] < y1) p.cor = cor; } }); }
    if (t === 'item' || t === 'escada') { const mod = t === 'escada' ? 'escada' : modelo; const ids = new Set(m.itens.map((i) => i.id));
      let px = Math.round(x * 4) / 4, py = Math.round(y * 4) / 4; const c = CATALOGO.find((k) => k.modelo === mod); if (!c) return;
      if (t === 'escada') { px = Math.floor(x); py = Math.floor(y); }
      if (c.parede === 'w') px = Math.round(x) + 0.05; if (c.parede === 'n') py = Math.round(y) + 0.05;
      const it = itemDoCatalogo(mod, px, py, andar, ids); return mudar(() => { m.itens.push(it); }); }
    if (t === 'mover') { if (!escolhido) { const it = itemEm(x, y); if (!it) return aviso('Toque num item.', 'erro'); escolhido = it.id; return desenhar(); }
      const it = m.itens.find((i) => i.id === escolhido); escolhido = null; if (!it) return desenhar();
      const nx = Math.round(x * 4) / 4, ny = Math.round(y * 4) / 4; return mudar(() => { const dx = nx - it.x, dy = ny - it.y; it.x = nx; it.y = ny; for (const u of it.uso || []) { u.x += dx; u.y += dy; } }); }
    if (t === 'fio') { const it = itemEm(x, y); if (!it) return aviso('Toque numa luz ou num interruptor.', 'erro');
      if (!escolhido) { if (!it.luz) return aviso('Primeiro, toque numa luz.', 'erro'); escolhido = it.id; aviso('Agora toque no interruptor.'); return desenhar(); }
      if (it.modelo !== 'interruptor') return aviso('Isso não é um interruptor.', 'erro'); const luz = m.itens.find((i) => i.id === escolhido); escolhido = null;
      return mudar(() => { luz.luz.interruptor = it.id; aviso('A luz ficou ligada a este interruptor.'); }); }
    if (t === 'apagar') {
      const it = itemEm(x, y); if (it) return mudar(() => { m.itens = m.itens.filter((i) => i !== it); });
      const p = pecaPerto(x, y); if (p) { const a = aberturaEm(p.lado, p.x, p.y); if (a) return mudar(() => { m.aberturas = m.aberturas.filter((b) => b !== a); });
        return mudar(() => { m.paredes = m.paredes.filter((q) => q !== p.p); }); }
      const c = comodoEm(Math.floor(x), Math.floor(y)); if (c) return mudar(() => { m.comodos = m.comodos.filter((o) => o !== c); });
      return aviso('Nada aqui para apagar.', 'erro');
    }
  }
  function evento(tipo, x, y) {
    if (!m) return; const t = ferramenta;
    if (tipo === 'inicio') { inicio = { x, y }; return; }
    if (tipo === 'arrastou') { inicio = null; return; } // o dedo moveu a câmera: não é toque (adendo 3)
    if (!inicio) return;
    if (t === 'comodo' || t === 'parede') {
      const f = forma(inicio, x, y);
      if (tipo === 'arrasto') return motor.marcar(f ? [f] : []);
      inicio = null; motor.marcar([]); if (!f) return;
      if (t === 'comodo') { const [a, b, x1, y1] = f.area; if (a < 0 || b < 0 || x1 > 40 || y1 > 40) return aviso('Fora da área (de 0 a 40).', 'erro');
        let n = 1; while (m.comodos.some((c) => c.id === 'comodo-' + n)) n++;
        return mudar(() => { m.comodos.push({ id: 'comodo-' + n, nome: 'Cômodo ' + n, piso, area: [a, b, x1, y1], ...(andar ? { andar } : {}) });
          for (let x2 = a; x2 < x1; x2++) for (const yy of [b, y1]) m.paredes.push({ de: [x2, yy], para: [x2 + 1, yy], cor, ...(andar ? { andar } : {}) });
          for (let y2 = b; y2 < y1; y2++) for (const xx of [a, x1]) m.paredes.push({ de: [xx, y2], para: [xx, y2 + 1], cor, ...(andar ? { andar } : {}) }); }); }
      return mudar(() => { const [x0, y0] = f.de, [x1, y1] = f.para; const n = y0 === y1; for (let k = Math.min(n ? x0 : y0, n ? x1 : y1); k < Math.max(n ? x0 : y0, n ? x1 : y1); k++)
        m.paredes.push({ de: n ? [k, y0] : [x0, k], para: n ? [k + 1, y0] : [x0, k + 1], cor, ...(andar ? { andar } : {}) }); });
    }
    if (tipo === 'fim') { const perto = Math.hypot(x - inicio.x, y - inicio.y) < 0.4; inicio = null; if (perto && t !== 'mao') tocar(x, y); }
  }
  function forma(a, x, y) {
    if (ferramenta === 'comodo') { const x0 = Math.floor(Math.min(a.x, x)), y0 = Math.floor(Math.min(a.y, y)), x1 = Math.floor(Math.max(a.x, x)) + 1, y1 = Math.floor(Math.max(a.y, y)) + 1;
      return { tipo: 'area', area: [x0, y0, x1, y1], erro: x0 < 0 || y0 < 0 || x1 > 40 || y1 > 40 }; }
    const sx = Math.round(a.x), sy = Math.round(a.y); const hor = Math.abs(x - a.x) >= Math.abs(y - a.y);
    const ex = hor ? Math.round(x) : sx, ey = hor ? sy : Math.round(y); if (ex === sx && ey === sy) return null; return { tipo: 'linha', de: [sx, sy], para: [ex, ey] };
  }
  function desenhar() {
    const sel = escolhido && m.itens.find((i) => i.id === escolhido);
    motor.marcar(sel ? [{ tipo: 'area', area: [sel.x, sel.y, sel.x + sel.w, sel.y + sel.d] }] : []);
    const b = (k, rot, extra = '') => `<button class="jogo__mini${extra}" data-c="${esc(k)}">${esc(rot)}</button>`;
    const opcoes = ferramenta === 'piso' ? PISOS.map((p) => b('piso:' + p, NOME_PISO[p], p === piso ? ' jogo__celula--sel' : '')).join('')
      : ferramenta === 'cor' || ferramenta === 'comodo' || ferramenta === 'parede' ? Object.keys(CORES_PAREDE).map((c) => b('cor:' + c, NOME_COR[c], c === cor ? ' jogo__celula--sel' : '')).join('')
      : ferramenta === 'item' ? [...new Set(CATALOGO.map((c) => c.grupo))].filter((g) => g !== 'Construção').map((g) => b('grupo:' + g, g, g === grupo ? ' jogo__celula--sel' : '')).join('')
        + '<span class="jogo__quebra"></span>' + CATALOGO.filter((c) => c.grupo === grupo && c.modelo !== 'escada').map((c) => b('modelo:' + c.modelo, NOMES[c.modelo] || c.modelo, c.modelo === modelo ? ' jogo__celula--sel' : '')).join('') : '';
    barra.innerHTML = `<p class="jogo__texto2">${esc(DICA[ferramenta])} Andar ${andar === 0 ? 'térreo' : andar}${sujo ? ' · não salvo' : ''}</p>`
      + (opcoes ? `<div class="jogo__opcoes">${opcoes}</div>` : '')
      + `<div class="jogo__ferramentas">${FERRAMENTAS.map(([k, n]) => b('f:' + k, n, k === ferramenta ? ' jogo__celula--sel' : '')).join('')}</div>`
      + `<div class="jogo__ferramentas">${b('andar:-', 'Andar abaixo')}${b('andar:+', 'Andar acima')}${b('desfazer', 'Desfazer')}${b('refazer', 'Refazer')}${b('ver', 'Ver tudo')}${b('salvar', 'Salvar')}${b('sair', sair ? 'Sair sem salvar?' : 'Sair')}</div>`;
  }
  barra.addEventListener('click', async (e) => {
    const k = (e.target.closest('[data-c]') || {}).dataset; if (!k || !k.c) return; const [a, v] = k.c.split(/:(.*)/s); if (a !== 'sair') sair = 0;
    if (a === 'f') { ferramenta = v; escolhido = null; motor.construir(modoDe(v)); }
    else if (a === 'piso') piso = v; else if (a === 'cor') cor = v; else if (a === 'grupo') { grupo = v; modelo = (CATALOGO.find((c) => c.grupo === v) || {}).modelo || modelo; } else if (a === 'modelo') modelo = v;
    else if (a === 'andar') { const n = Math.max(0, Math.min(3, andar + (v === '+' ? 1 : -1))); if (n !== andar) { andar = n; motor.remontar(m, andar); } }
    else if (a === 'desfazer' || a === 'refazer') { const de = a === 'desfazer' ? antes : depois, para = a === 'desfazer' ? depois : antes; if (!de.length) return aviso('Nada para ' + a + '.');
      para.push(JSON.stringify(m)); m = JSON.parse(de.pop()); sujo = true; motor.remontar(m, andar); }
    else if (a === 'ver') motor.verTudo();
    else if (a === 'salvar') { const r = await enviar({ acao: 'construir', valor: { mapa: m, base } }); if (!r) return;
      if (r.ok === false) return aviso(r.erro || 'Não deu para salvar.', 'erro'); if (r.mapa) { m = copia(r.mapa); base = r.mapa.versao; } orig = copia(m); sujo = false; antes = []; depois = []; aviso('Salvo.'); }
    else if (a === 'sair') { if (sujo && !sair) { sair = 1; return desenhar(); } return fechar(); }
    desenhar();
  });
  function abrir() { m = copia(motor.mapa()); base = m.versao; mapaId = m.id; andar = motor.andarVisto(); antes = []; depois = []; sujo = false; sair = 0; escolhido = null; ferramenta = 'comodo';
    orig = copia(m); normalizar(); barra.hidden = false; motor.construir(modoDe(ferramenta)); motor.remontar(m, andar); desenhar(); }
  function fechar() { barra.hidden = true; motor.construir(null); if (sujo) aviso('Saiu sem salvar.'); motor.remontar(orig, 0); m = null; sujo = false; }
  return { abrir, fechar, evento, aberto: () => !barra.hidden };
}
