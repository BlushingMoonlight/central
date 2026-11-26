// Central — os menus de item do jogo (DEC-150, DEC-175; layout/telas 06 a 11): abrem só quando o item é escolhido, ao lado
// dele, com um ponto no item; toque e botões juntos; o "voltar" do Android fecha; alvos de 48 px. Cada ação vai ao servidor
// (o 68), que decide e devolve a cena nova; a recusa (a Morgan em casa, o medo, a tomada) aparece como aviso.
import { NOMES, FUNCOES, materialDe, funcaoDe, CATALOGO, FUNCOES_FILTRO } from './catalogo.js';
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CORES = [['Quente', '#ffc27a'], ['Fria', '#ffe9c4'], ['Azul', '#9fd3ff'], ['Rosa', '#ff6fb5'], ['Verde', '#7dff9b'], ['Vermelha', '#ff5a5a']];
const FUSOS = [['Nova York', 'America/New_York'], ['Canoinhas', 'America/Sao_Paulo'], ['Londres', 'Europe/London'], ['Lisboa', 'Europe/Lisbon'], ['Tóquio', 'Asia/Tokyo'], ['Los Angeles', 'America/Los_Angeles']];

const barra = (rot, v) => `<div class="jogo__texto2">${esc(rot)} <span class="jogo__barra"><i style="width:${Math.max(0, Math.min(100, Math.round(v)))}%"></i></span> ${Math.round(v)}</div>`;
const botao = (rot, acao, extra = '') => `<button class="jogo__linha" data-acao="${esc(acao)}"${extra}>${esc(rot)}</button>`;
const par = (rot, menos, mais) => `<div class="jogo__par"><button class="jogo__mini" data-acao="${esc(menos)}" aria-label="Menos">‹</button><span class="jogo__texto">${esc(rot)}</span><button class="jogo__mini" data-acao="${esc(mais)}" aria-label="Mais">›</button></div>`;

// As dicas da primeira vez (J3): cada gesto novo tem uma dica curta, só uma vez, que nunca volta (neste aparelho).
let vistas = {}; try { vistas = JSON.parse(localStorage.getItem('jogo-dicas') || '{}') || {}; } catch (e) { vistas = {}; }
const DICAS = { roda: 'A ação do meio é a principal. Toque fora para fechar.', longo: 'Segure o dedo num item para ver o que é e de onde veio.',
  construir: 'Arraste um móvel para mudar de lugar; "Girar" gira. Arrastar no vazio move a câmera.', criador: 'Toque no cabelo, no rosto ou na roupa para mudar só aquela parte.' };
// A vibração curta do toque (no Android; o iPad não vibra).
export const vibrar = () => { try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) { /* sem vibração */ } };
const temPainel = (it) => !!(it && (it.luz || it.inventario || ['tv', 'toca_discos', 'violao', 'relogio', 'relogio_j', 'caixa_areia', 'potes_gato', 'interruptor'].includes(it.modelo)));

export function criarMenus({ raiz, motor, enviar, som, usar }) {
  const caixa = document.createElement('div'); caixa.className = 'jogo__menu'; caixa.hidden = true; caixa.setAttribute('role', 'dialog'); raiz.appendChild(caixa);
  const ponto = document.createElement('div'); ponto.className = 'jogo__ponto'; ponto.hidden = true; raiz.appendChild(ponto);
  const avisos = document.createElement('div'); avisos.className = 'jogo__avisos'; avisos.setAttribute('role', 'status'); raiz.appendChild(avisos);
  // O menu em círculo (J3): até 6 ações, a principal no centro; e a ficha do toque longo.
  const roda = document.createElement('div'); roda.className = 'jogo__roda'; roda.hidden = true; roda.setAttribute('role', 'menu'); raiz.appendChild(roda);
  const info = document.createElement('div'); info.className = 'jogo__menu jogo__info'; info.hidden = true; info.setAttribute('role', 'dialog'); raiz.appendChild(info);
  let naRoda = null;
  let aberto = null; let comp = 0; let escolhido = null;
  function dica(k) { if (vistas[k] || !DICAS[k]) return; vistas[k] = 1; try { localStorage.setItem('jogo-dicas', JSON.stringify(vistas)); } catch (e) { /* segue */ } aviso(DICAS[k]); }
  function aviso(texto, tipo = '') { const a = document.createElement('div'); a.className = 'jogo__aviso' + (tipo ? ' jogo__aviso--' + tipo : ''); a.textContent = texto; avisos.appendChild(a); setTimeout(() => a.remove(), 4500); }
  function fechar(doHistorico) { if (!aberto) return; caixa.hidden = true; ponto.hidden = true; aberto = null; if (!doHistorico && history.state && history.state.menuJogo) history.back(); }
  function fecharRoda(doHistorico) { if (!naRoda && info.hidden) return; roda.hidden = true; info.hidden = true; ponto.hidden = true; naRoda = null; if (!doHistorico && history.state && history.state.menuJogo) history.back(); }
  window.addEventListener('popstate', () => { if (aberto) fechar(true); if (naRoda || !info.hidden) fecharRoda(true); });
  // O que o boneco do Jean faz aqui: só com ele no mesmo mapa, à vista e solto (não viajando nem esperando).
  const jeanAqui = () => { const j = motor.jean && motor.jean(); return !!(j && j.visivel && !j.preso); };
  function acoesDe(id) {
    const c = motor.estado() || {}; const m = c.mapa || { itens: [] }; const it = m.itens.find((i) => i.id === id); const e = (c.itens || {})[id] || {}; const L = [];
    if (id === 'gato') return [['gato:carinho', 'Carinho'], ['gato:colo', 'Colo'], ['gato:brincar', 'Brincar'], ['gato:petisco', 'Petisco'], ['mais', 'Ver']];
    if (!it) return L; const mod = it.modelo;
    if (jeanAqui()) for (const f of FUNCOES[mod] || []) L.push(['usar:' + f[0], f[1]]);
    if (it.luz || mod === 'tv') L.push([e.ligada ? 'desligar' : 'ligar', e.ligada ? 'Desligar' : 'Ligar']);
    if (mod === 'toca_discos') L.push([e.tocando ? 'pausar' : 'tocar', e.tocando ? 'Pausar' : 'Tocar']);
    if (mod === 'caixa_areia') L.push(['limpar', 'Limpar']); if (mod === 'potes_gato') L.push(['encher', 'Encher']);
    if (mod === 'violao' && !jeanAqui()) L.push(['pedir_musica', 'Pedir música']); if (mod === 'interruptor') L.push(['interruptor', 'As luzes']);
    if (temPainel(it)) L.push(['mais', 'Mais']);
    if (!it.fora) L.push(['mover', 'Mover']);
    return L.slice(0, 6);
  }
  function abrirRoda(id, sx, sy) {
    const L = acoesDe(id); if (!L.length) return; fechar(); const novo = !naRoda && info.hidden; info.hidden = true; naRoda = { id, sx, sy };
    const r = raiz.getBoundingClientRect(); const cx = Math.max(112, Math.min(r.width - 112, sx)), cy = Math.max(112, Math.min(r.height - 112, sy));
    const [p0, ...volta] = L; const n = volta.length; const R = 92;
    roda.innerHTML = `<button class="jogo__roda-b jogo__roda-b--centro" data-acao="${esc(p0[0])}">${esc(p0[1])}</button>`
      + volta.map(([a, rot], k) => `<button class="jogo__roda-b" data-acao="${esc(a)}" data-k="${k}">${esc(rot)}</button>`).join('');
    roda.style.left = Math.round(cx) + 'px'; roda.style.top = Math.round(cy) + 'px';
    roda.querySelectorAll('[data-k]').forEach((b) => { const ang = -Math.PI / 2 + (Number(b.dataset.k) / n) * Math.PI * 2; b.style.left = Math.round(Math.cos(ang) * R) + 'px'; b.style.top = Math.round(Math.sin(ang) * R) + 'px'; });
    ponto.hidden = false; ponto.style.left = sx + 'px'; ponto.style.top = sy + 'px';
    roda.hidden = false; if (novo) history.pushState({ menuJogo: true }, '');
    const it = ((motor.estado() || {}).mapa || { itens: [] }).itens.find((i) => i.id === id); som.material(id === 'gato' ? 'tecido' : materialDe(it && it.modelo), id); vibrar();
    const b0 = roda.querySelector('button'); if (b0) b0.focus({ preventScroll: true }); dica('roda');
  }
  // O toque longo (J3): o que é, de onde veio e o estado, sem mexer em nada.
  function mostrarInfo(id, sx, sy) {
    const c = motor.estado() || {}; const it = ((c.mapa || { itens: [] }).itens || []).find((i) => i.id === id); const e = (c.itens || {})[id] || {};
    if (!it && id !== 'gato') return; roda.hidden = true; fechar(); const novo = !naRoda && info.hidden; naRoda = null;
    const g = c.gato || {}; const nome = id === 'gato' ? (g.nome || 'Gato') : NOMES[it.modelo] || it.modelo.replace(/_/g, ' ');
    const cat = it && CATALOGO.find((k) => k.modelo === it.modelo); const func = id === 'gato' ? 'o gato da casa' : FUNCOES_FILTRO[funcaoDe(cat || it)].toLowerCase() + ', de ' + ({ madeira: 'madeira', vidro: 'vidro', tecido: 'tecido', metal: 'metal', papel: 'papel', ceramica: 'cerâmica' }[materialDe(it.modelo)]);
    const estado = id === 'gato' ? (g.acao || 'por aí') : it.luz || it.modelo === 'tv' ? (e.ligada ? 'ligada' : 'desligada') : it.modelo === 'toca_discos' ? (e.tocando ? 'tocando' : 'parado') : it.modelo === 'caixa' ? 'fechada, esperando alguém abrir' : 'no lugar';
    const veio = id === 'gato' ? 'da família' : it.origem || (it.modelo === 'caixa' && it.conteudo ? 'uma entrega: ' + (it.conteudo.nome || 'uma encomenda') : 'está na casa desde o começo');
    info.innerHTML = `<p class="jogo__titulo">${esc(nome)}</p><p class="jogo__texto2">O que é: ${esc(func)}</p><p class="jogo__texto2">De onde veio: ${esc(veio)}</p><p class="jogo__texto2">Agora: ${esc(estado)}</p>`
      + '<button class="jogo__linha" data-fechar>Fechar</button>';
    info.hidden = false; const r = raiz.getBoundingClientRect(); info.style.left = Math.round(Math.max(8, Math.min(r.width - info.offsetWidth - 8, sx - info.offsetWidth / 2))) + 'px';
    info.style.top = Math.round(Math.max(8, Math.min(r.height - info.offsetHeight - 8, sy + 24))) + 'px'; ponto.hidden = false; ponto.style.left = sx + 'px'; ponto.style.top = sy + 'px';
    if (novo) history.pushState({ menuJogo: true }, ''); som.toque(); vibrar();
  }
  info.addEventListener('click', (ev) => { if (ev.target.closest('[data-fechar]')) fecharRoda(); });
  roda.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-acao]'); if (!b || !naRoda) return; const a = b.dataset.acao; const { id, sx, sy } = naRoda;
    if (a === 'mais') { roda.hidden = true; naRoda = null; return abrirPainel(id, sx, sy, true); }
    if (a.startsWith('usar:')) { fecharRoda(); som.toque(); return usar && usar(id, a.slice(5)); }
    if (a === 'mover') { fecharRoda(); motor.mover(id); aviso('Toque onde quer pôr. No celular: Girar ou Cancelar.'); window.dispatchEvent(new CustomEvent('jogo-movendo', { detail: id })); return; }
    fecharRoda(); const r = await agir(corpoDe(a, id)); if (r && id === 'gato') som.miau();
  });
  // Tocar fora do menu em círculo fecha (o "voltar" do Android também).
  raiz.addEventListener('pointerdown', (ev) => { if ((naRoda || !info.hidden) && !ev.target.closest('.jogo__roda, .jogo__info')) fecharRoda(); }, true);
  function corpoDe(a, id) {
    const c = motor.estado() || {}; const e = (c.itens || {})[id] || {}; let corpo = { acao: 'item', item: id };
    if (a.startsWith('gato:')) return { acao: 'item', item: 'gato', op: a.slice(5) };
    if (a.startsWith('inv:')) { const n = ((e.inventario || {}).compartimentos || []).length || 1; return { acao: 'inventario', item: id, op: a.slice(4), valor: { compartimento: comp, nome: escolhido, para: (comp + 1) % n } }; }
    if (a.startsWith('brilho:')) corpo.op = 'brilho', corpo.valor = Math.max(0, Math.min(100, (e.brilho ?? 85) + (a.endsWith('+') ? 10 : -10)));
    else if (a.startsWith('volume:')) corpo.op = 'volume', corpo.valor = Math.max(0, Math.min(10, (e.volume ?? 4) + (a.endsWith('+') ? 1 : -1)));
    else if (a.includes(':')) { const [op, v] = a.split(/:(.*)/s); corpo.op = op; corpo.valor = /^-?\d+$/.test(v) ? Number(v) : v; }
    else corpo.op = a;
    return corpo;
  }
  function posicionar(sx, sy) {
    ponto.hidden = false; ponto.style.left = sx + 'px'; ponto.style.top = sy + 'px';
    const r = raiz.getBoundingClientRect(); const w = caixa.offsetWidth, h = caixa.offsetHeight;
    let x = sx + 24, y = sy - h / 2; if (x + w > r.width - 8) x = sx - w - 24; if (x < 8) { x = Math.max(8, Math.min(r.width - w - 8, sx - w / 2)); y = sy + 24; if (y + h > r.height - 8) y = sy - h - 24; }
    caixa.style.left = Math.round(x) + 'px'; caixa.style.top = Math.round(Math.max(8, Math.min(r.height - h - 8, y))) + 'px';
  }
  async function agir(corpo) {
    som.toque();
    try { const c = await enviar(corpo); motor.atualizar(c); for (const t of c.avisos || []) aviso(t); if (c.reacao) aviso(c.reacao === 'ue' ? 'Ela estranhou.' : c.reacao === 'defeito' ? 'Ela acha que é defeito.' : c.reacao === 'eletricista' ? 'Ela tirou da tomada e vai chamar o eletricista.' : c.reacao === 'viu_jean' ? 'Ela viu você!' : 'Ela ficou com medo.'); som.certo(); return c; }
    catch (e) { som.recusa(); aviso(e.message || 'Não deu certo agora.', 'erro'); return null; }
  }
  function desenhar(id) {
    const c = motor.estado() || {}; const m = c.mapa || { itens: [] }; const it = m.itens.find((i) => i.id === id); const e = (c.itens || {})[id] || {};
    const nome = id === 'gato' ? ((c.gato || {}).nome || 'Gato') : NOMES[it && it.modelo] || (it ? it.modelo.replace(/_/g, ' ') : id);
    let estado = '', corpo = '';
    if (id === 'gato') { const g = c.gato || { necessidades: {} }; const n = g.necessidades; estado = g.acao === 'ronronando' ? 'ronrom' : g.acao === 'dormindo' ? 'dormindo' : 'acordado';
      corpo = barra('Fome', n.fome) + barra('Sede', n.sede) + barra('Carinho', n.carinho) + barra('Energia', n.sono) + barra('Diversão', n.diversao) + barra('Saúde', g.saude)
        + botao('Fazer carinho', 'gato:carinho') + botao('Pegar no colo', 'gato:colo') + botao('Brincar', 'gato:brincar') + botao(`Dar petisco (${((c.casa || {}).estoque || {}).petisco ?? 0})`, 'gato:petisco'); }
    else if (it && it.luz) { estado = e.tomada_ate && Date.parse(e.tomada_ate) > Date.now() ? 'fora da tomada' : e.ligada ? 'ligada' : 'desligada';
      corpo = botao(e.ligada ? 'Desligar' : 'Ligar', e.ligada ? 'desligar' : 'ligar') + par(`Brilho ${e.brilho ?? 85}%`, 'brilho:-', 'brilho:+')
        + (it.luz.rgb ? '<div class="jogo__cores">' + CORES.map(([n, h]) => `<button class="jogo__cor" data-acao="cor:${h}" aria-label="${esc(n)}" style="background:${h}"></button>`).join('') + '</div>' : '')
        + botao('Interruptor do cômodo', 'interruptor') + '<div class="jogo__par">' + [15, 30, 60].map((mn) => `<button class="jogo__mini" data-acao="timer:${mn}">${mn} min</button>`).join('') + '</div>'; }
    else if (it && it.modelo === 'tv') { estado = e.ligada ? (e.programa || 'ligada') : 'desligada';
      corpo = botao(e.ligada ? 'Desligar' : 'Ligar', e.ligada ? 'desligar' : 'ligar') + par(`${e.canal || 1} ${e.programa || ''}`.trim(), 'canal:-1', 'canal:1') + par(`Volume ${e.volume ?? 4}`, 'volume:-', 'volume:+')
        + botao(e.mudo ? 'Tirar o mudo' : 'Mudo', 'mudo') + botao(e.videogame ? 'Voltar à TV' : 'Videogame', 'videogame') + botao('Assistir junto', 'assistir_junto'); }
    else if (it && it.modelo === 'toca_discos') { estado = e.tocando ? e.musica || 'tocando' : 'parado'; corpo = botao(e.tocando ? 'Pausar' : 'Tocar', e.tocando ? 'pausar' : 'tocar') + botao('Trocar o disco', 'disco'); }
    else if (it && it.modelo === 'interruptor') { estado = 'na parede'; corpo = botao('Ligar ou desligar as luzes', 'interruptor'); }
    else if (it && it.modelo === 'violao') { estado = 'no canto'; corpo = botao('Pedir uma música', 'pedir_musica'); }
    else if (it && /^relogio/.test(it.modelo)) { const f = e.fuso || (it.modelo === 'relogio_j' ? 'America/Sao_Paulo' : 'America/New_York'); const nomeF = (FUSOS.find((x) => x[1] === f) || ['?'])[0];
      estado = new Intl.DateTimeFormat('pt-BR', { timeZone: f, hour: '2-digit', minute: '2-digit' }).format(new Date()) + ' · ' + nomeF;
      const i = FUSOS.findIndex((x) => x[1] === f); corpo = par('Fuso: ' + nomeF, 'fuso:' + FUSOS[(i + FUSOS.length - 1) % FUSOS.length][1], 'fuso:' + FUSOS[(i + 1) % FUSOS.length][1]); }
    else if (it && it.modelo === 'caixa_areia') { estado = e.fora ? 'suja demais' : (e.sujeira || 0) >= 60 ? 'suja' : 'limpa'; corpo = barra('Sujeira', e.sujeira || 0) + barra('Areia', e.quantidade ?? 100) + botao('Limpar', 'limpar') + botao('Trocar a areia', 'trocar_areia'); }
    else if (it && it.modelo === 'potes_gato') { estado = (e.racao || 0) > 0 ? 'com ração' : 'vazio'; corpo = barra('Ração', e.racao ?? 100) + barra('Água', e.agua ?? 100) + botao('Encher', 'encher'); }
    else if (it && it.inventario) { const inv = (e.inventario || { compartimentos: [] }).compartimentos; const cp = inv[comp] || { nome: 'Vazio', itens: {} }; estado = cp.nome;
      corpo = (inv.length > 1 ? par(`${cp.nome} (${comp + 1} de ${inv.length})`, 'comp:-', 'comp:+') : '')
        + '<div class="jogo__grade">' + (Object.keys(cp.itens).length ? Object.entries(cp.itens).map(([n, q]) => `<button class="jogo__celula${escolhido === n ? ' jogo__celula--sel' : ''}" data-acao="sel:${esc(n)}">${esc(n)} ×${q}</button>`).join('') : '<p class="jogo__texto2">Vazio</p>') + '</div>'
        + (escolhido && cp.itens[escolhido] ? '<div class="jogo__par">' + ['Pegar', 'Usar', 'Mover'].map((o) => `<button class="jogo__mini" data-acao="inv:${o.toLowerCase()}">${o}</button>`).join('') + '</div>' : ''); }
    if (it && !it.fora && !it.inventario || (it && it.inventario && !escolhido)) corpo += botao('Mover', 'mover');
    caixa.innerHTML = `<p class="jogo__titulo">${esc(nome)} <span class="jogo__texto2">${esc(estado)}</span></p>${corpo}<button class="jogo__linha" data-acao="fechar">Fechar</button>`;
  }
  async function aoClicar(ev) {
    const b = ev.target.closest('[data-acao]'); if (!b || !aberto) return; const a = b.dataset.acao; const id = aberto.id; const c = motor.estado() || {}; const e = (c.itens || {})[id] || {};
    if (a === 'fechar') return fechar();
    if (a === 'mover') { fechar(); motor.mover(id); aviso('Toque onde quer pôr. No celular: Girar ou Cancelar.'); aberto = null; window.dispatchEvent(new CustomEvent('jogo-movendo', { detail: id })); return; }
    if (a.startsWith('comp:')) { const n = ((e.inventario || {}).compartimentos || []).length || 1; comp = (comp + (a === 'comp:+' ? 1 : n - 1)) % n; escolhido = null; return desenhar(id); }
    if (a.startsWith('sel:')) { escolhido = a.slice(4); return desenhar(id); }
    const corpo = corpoDe(a, id); void e;
    b.setAttribute('aria-disabled', 'true'); const r = await agir(corpo); b.removeAttribute('aria-disabled');
    if (corpo.acao === 'inventario' && r) escolhido = null;
    if (aberto && aberto.id === (corpo.item === 'gato' ? 'gato' : id)) { desenhar(aberto.id); posicionar(aberto.sx, aberto.sy); }
    if (corpo.item === 'gato' && r) som.miau();
  }
  caixa.addEventListener('click', aoClicar);
  // O painel completo do item (o brilho, as cores, o canal, o inventário): o "Mais" do menu em círculo.
  function abrirPainel(id, sx, sy, daRoda) { if (aberto && aberto.id !== id) fechar(); comp = 0; escolhido = null; const novo = !aberto && !daRoda; aberto = { id, sx, sy }; desenhar(id); caixa.hidden = false; posicionar(sx, sy);
    if (novo) history.pushState({ menuJogo: true }, ''); som.toque(); const p = caixa.querySelector('button'); if (p) p.focus({ preventScroll: true }); }
  return {
    // Tocar num item abre o menu em círculo (J3); sem ação nenhuma, nada abre.
    abrir(id, sx, sy) { if (!acoesDe(id).length) return; abrirRoda(id, sx, sy); },
    painel: abrirPainel, info: (id, sx, sy) => { mostrarInfo(id, sx, sy); dica('longo'); }, acoesDe, dica,
    fechar: (h) => { fechar(h); fecharRoda(h); }, aviso, agir, rodaAberta: () => !!naRoda,
  };
}
