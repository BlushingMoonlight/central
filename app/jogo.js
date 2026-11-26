// Central — o jogo (JG, etapa 8 e rodada 9, parte I; DEC-174 a DEC-176, DEC-199): o app é o jogo. A casa da Pepper (ou a
// do Jean) em tela cheia (DEC-149); o celular do Jean é o menu (jogo/celular.js), e os apps dele (as telas do app antigo)
// abrem numa janela por cima (janelaDoApp), com o jogo vivo por baixo. Carrega o Phaser 4 e a cena (jogo/), pede o estado
// ao servidor (o workflow 68, POST jogo/cena) a cada minuto e quando o app volta à frente. Tocar num item abre o menu dele
// (jogo/menu.js); tocar numa pessoa abre a ficha (jogo/ficha.js); o construtor está em jogo/construtor.js; os controles na
// tela, em jogo/controles.js. A hora vem do servidor, nunca do relógio do aparelho. Sem internet: abre com o último estado
// guardado e mostra "reconectando"; o que o Jean faz fica guardado e vai depois, uma vez só (o id de cada ação).
import { chamar, endereco, modoDemo, definirPapel, marcarDesatualizado, papel } from './api.js';
import { VERSAO } from './versao.js';
import { esc, CARREGANDO } from './ui.js';

let motor = null; let relogio = null; let ultimo = null; let som = null; let mapaAtual = 'casa-pepper';
let casca = null, carga = null, celular = null, menus = null, ficha = null, abaPendente = null, montagem = 0;
const CHAVE_ULTIMO = 'jogo-ultimo', CHAVE_FILA = 'jogo-fila', CHAVE_INTRO = 'jogo-apresentacao';
const ler = (k, padrao) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : padrao; } catch (e) { return padrao; } };
const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento: segue */ } };
const novoId = () => (crypto.randomUUID ? crypto.randomUUID() : 'a' + Date.now().toString(16) + Math.random().toString(16).slice(2, 10));
const carregarScript = (src) => new Promise((ok, falha) => { if (window.Phaser) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => falha(new Error('sem o motor do jogo')); document.head.appendChild(s); });
// O relógio do servidor (I-pesquisa 3): cada resposta com "agora" acerta a diferença; o relógio do aparelho nunca decide.
let desvio = 0;
export const agoraMs = () => Date.now() + desvio;
const acertar = (r) => { const t = r && Date.parse(r.agora); if (Number.isFinite(t)) desvio = t - Date.now(); return r; };
const horaEm = (fuso) => new Intl.DateTimeFormat('pt-BR', { timeZone: fuso, hour: '2-digit', minute: '2-digit' }).format(new Date(agoraMs()));
const horaNY = () => { const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date(agoraMs())); return Number(p[0].value) + Number(p[2].value) / 60; };
const HUMOR = { bem: 'humor--bem', meio: 'humor--meio', mal: 'humor--mal' };
const humorDe = (t) => (/trist|brav|irrit|cansad|preocup|medo|chatead/i.test(t || '') ? 'mal' : /calm|ok|normal|neutr|pensativ/i.test(t || '') || !t ? 'meio' : 'bem');
const NOMES_PERTO = { tv: 'TV', toca_discos: 'Toca-discos', violao: 'Violão', relogio: 'Relógio', relogio_j: 'Relógio', caixa_areia: 'Areia', potes_gato: 'Potes', interruptor: 'Interruptor', geladeira: 'Geladeira' };
const chamarComHora = async (caminho, corpo) => acertar(await chamar(caminho, corpo));

let ui = null; // os controles na tela (o "reconectando")
const offline = (on) => { if (ui) ui.offline(on); };
// Uma ação do Jean: vai com o mapa que ele está vendo e um id. Sem conexão, fica guardada e vai depois.
async function enviar(corpo) {
  const pedido = { ...corpo, mapa: corpo.mapa || mapaAtual }; if (pedido.acao !== 'cena') pedido.id = novoId();
  try { const r = await chamarComHora('jogo/cena', pedido); offline(false); esvaziarFila(); return r; } catch (e) {
    if (e.tipo !== 'rede') throw e; offline(true);
    if (pedido.acao !== 'cena') { const f = ler(CHAVE_FILA, []); f.push(pedido); gravar(CHAVE_FILA, f.slice(-50)); throw new Error('Sem conexão: fica guardado e vai quando voltar.'); }
    throw e;
  }
}
let esvaziando = false;
async function esvaziarFila() {
  if (esvaziando) return; const f = ler(CHAVE_FILA, []); if (!f.length) return; esvaziando = true;
  try { while (f.length) { try { await chamar('jogo/cena', f[0]); } catch (e) { if (e.tipo === 'rede') break; } f.shift(); gravar(CHAVE_FILA, f); } } finally { esvaziando = false; }
}

// O papel e a versão (DEC-200, DEC-202): o celular do jogo (o 69) diz os dois. O app velho demais para de gravar.
export async function saberPapel() {
  try { const r = await chamarComHora('jogo/celular', { acao: 'abas', versao: VERSAO }); notarAbas(r); return r.papel || 'jogador'; } catch (e) { return 'jogador'; }
}
function notarAbas(r) {
  if (!r) return; definirPapel(r.papel);
  if (r.versao && r.versao.atualize) { marcarDesatualizado(); mostrarAtualize(); }
}
function mostrarAtualize() {
  if (!casca || casca.querySelector('[data-atualize]')) return;
  casca.insertAdjacentHTML('beforeend', '<div class="jogo__intro" data-atualize role="alertdialog"><p class="jogo__titulo">Tem uma versão nova</p>'
    + '<p class="jogo__texto">Esta versão é antiga e não grava mais nada. Atualize para continuar.</p><button class="jogo__mini" data-recarregar>Atualizar</button></div>');
  casca.querySelector('[data-recarregar]').addEventListener('click', () => location.reload());
}

function pararMotor() {
  if (relogio) clearInterval(relogio); relogio = null; if (motor) { motor.destruir(); motor = null; } if (som) som.parar();
  document.removeEventListener('visibilitychange', aoVoltar); window.removeEventListener('online', aoOnline);
}
async function aoVoltar() { if (document.visibilityState === 'visible' && motor) { try { aplicar(await enviar({ acao: 'cena' })); } catch (e) { /* segue com a última cena */ } } }
function aoOnline() { esvaziarFila(); aoVoltar(); }
function aplicar(c) {
  if (!c || !motor) return; ultimo = c; mapaAtual = c.mapa_id || mapaAtual; motor.atualizar(c);
  if (menus) for (const t of c.avisos || []) { menus.aviso(t); if (celular) celular.guardarAviso(t); }
  if ((c.avisos || []).length) casca?.querySelector('[data-celular]')?.classList.add('jogo__celular--novo');
  if (!c.offline) gravar(CHAVE_ULTIMO, c);
  const it = c.itens || {}; const tv = it.tv || {};
  if (som) som.atualizar({ hora: horaNY(), clima: c.clima, tv: !!tv.ligada, volumeTv: tv.volume ?? 4, mudo: !!tv.mudo, tocando: !!(it['toca-discos'] || {}).tocando, ronrom: (c.gato || {}).acao === 'ronronando' });
}

// A abertura (I3): a janela da casa acendendo, em pixel art, em menos de 3 segundos; um toque pula. Também é a tela de
// carregamento: se o jogo ainda não chegou quando a animação acaba, ela fica, com o "carregando".
const ABERTURA = '<div class="jogo__abertura" data-abertura role="img" aria-label="A janela da casa acendendo">'
  + '<svg class="abertura__arte" viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true">'
  + '<rect class="abertura__noite" width="32" height="32"/><rect class="abertura__parede" x="4" y="9" width="24" height="23"/>'
  + '<rect class="abertura__telhado" x="2" y="7" width="28" height="3"/><rect class="abertura__telhado" x="6" y="4" width="20" height="3"/>'
  + '<rect class="abertura__moldura" x="9" y="13" width="14" height="12"/><rect class="abertura__vidro" x="10" y="14" width="12" height="10"/>'
  + '<rect class="abertura__luz" x="10" y="14" width="12" height="10"/><rect class="abertura__moldura" x="15" y="14" width="2" height="10"/>'
  + '<rect class="abertura__moldura" x="10" y="18" width="12" height="2"/><rect class="abertura__gato" x="11" y="21" width="3" height="3"/>'
  + '<rect class="abertura__estrela" x="5" y="2" width="1" height="1"/><rect class="abertura__estrela" x="27" y="3" width="1" height="1"/></svg>'
  + '<p class="jogo__texto2 abertura__texto" data-abertura-texto></p></div>';

export function desmontarJogo() {
  montagem++; pararMotor(); if (casca) casca.remove(); casca = null; carga = null; celular = null; menus = null; ficha = null; ui = null;
}

// O jogo, uma vez só por abertura: a casca na hora (com a janela do app e a abertura) e o motor carregando por baixo.
// Devolve a promessa da carga ('pronto' ou 'erro'); a janela do app não espera por ela.
export function garantirJogo(raiz, { fase } = {}) {
  if (casca && casca.isConnected) return carga;
  desmontarJogo(); const minha = ++montagem;
  raiz.innerHTML = '<div class="jogo" data-casca><div class="jogo__mundo" data-mundo></div>'
    // O chip é só informação (DEC-198): quem abre o celular é o botão do celular.
    + '<div class="jogo__chip" data-chip role="status" aria-label="Hora e humor"><span data-hora></span><span class="jogo__humor" data-humor></span></div>'
    + '<button class="jogo__celular" data-celular aria-label="Celular"><span class="jogo__celular-tela"></span></button>'
    // Os botões de zoom ficam só como opção de acessibilidade, desligada de fábrica (DEC-198): a pinça, o toque duplo e a roda seguem.
    + '<div class="jogo__zoom" data-zoomcaixa hidden><button class="jogo__mini" data-zoom="1" aria-label="Aproximar">+</button><button class="jogo__mini" data-zoom="-1" aria-label="Afastar">−</button>'
    + '<button class="jogo__mini" data-centro aria-label="Centralizar">◎</button></div>'
    + '<div class="jogo__folha" data-folha hidden></div><div class="jogo__carga" data-carga hidden></div>' + ABERTURA
    + '<section class="jogo__app" data-app hidden aria-label="App do celular"></section></div>';
  casca = raiz.querySelector('[data-casca]');
  const abertura = casca.querySelector('[data-abertura]');
  let animou = false, chegou = false;
  const tirarAbertura = () => { if (abertura.isConnected) abertura.remove(); };
  abertura.addEventListener('click', tirarAbertura);
  setTimeout(() => { animou = true; if (chegou) tirarAbertura(); else { const t = abertura.querySelector('[data-abertura-texto]'); if (t) t.textContent = 'Carregando…'; } }, modoDemo ? 300 : 2600);
  const avisar = (f) => fase && fase(f);
  carga = (async () => {
    let d;
    try {
      await carregarScript('jogo/phaser.min.js');
      try { d = await chamarComHora('jogo/cena', { acao: 'cena', mapa: 'casa-pepper' }); } catch (e) {
        const salvo = ler(CHAVE_ULTIMO, null); if (e.tipo === 'rede' && salvo) d = { ...salvo, offline: true }; else throw e; }
      if (minha !== montagem) return 'erro';
      await montarMotor(d, minha);
      chegou = true; if (animou) tirarAbertura();
      avisar('pronto'); return 'pronto';
    } catch (e) {
      if (minha !== montagem) return 'erro';
      if (e && e.tipo === 'sessao') { location.replace('#entrar'); return 'erro'; }
      tirarAbertura(); const c = casca.querySelector('[data-carga]'); c.hidden = false;
      // Sem o jogo, os apps continuam a um toque: a conversa e o resto não se perdem.
      c.innerHTML = '<p class="jogo__titulo">A casa não carregou</p><p class="jogo__texto">Confira a internet e tente de novo.</p>'
        + '<div class="jogo__par"><button class="jogo__mini" data-tentar>Tentar de novo</button><a class="jogo__mini" href="#CV">Mensagens</a></div>';
      c.querySelector('[data-tentar]').addEventListener('click', () => { const r = casca.parentElement; desmontarJogo(); garantirJogo(r, { fase }); });
      avisar('erro'); return 'erro';
    }
  })();
  return carga;
}

// A janela do app: aberta com a tela da vez (devolve o lugar onde desenhar) ou fechada (t = null). Em pé no celular ela
// cobre a tela e o jogo dorme por baixo; deitado e no iPad, é um painel do lado, e o jogo segue à vista.
export function janelaDoApp(t) {
  const j = casca && casca.querySelector('[data-app]'); if (!j) return null;
  if (!t) { if (!j.hidden) { j.hidden = true; j.innerHTML = ''; } if (motor) motor.pausar(false); return null; }
  if (celular && celular.aberta()) celular.fechar(true);
  if (ficha) ficha.fechar();
  const lado = innerWidth >= 700; j.classList.toggle('jogo__app--lado', lado); j.hidden = false; j.scrollTop = 0;
  if (motor) motor.pausar(!lado);
  j.innerHTML = CARREGANDO; return j;
}
// #JG/<aba>: o celular aberto nessa aba (a volta de um app é a tela de início do celular, a aba Celular).
export function celularNaAba(aba) { if (celular) celular.abrir(aba); else abaPendente = aba; }

async function montarMotor(d, minha) {
  const raiz = casca; mapaAtual = d.mapa_id || 'casa-pepper';
  const [{ criarJogo }, { criarMenus }, S, { criarCelular }, { criarConstrutor }, { criarControles }, { criarFicha }] = await Promise.all([import('../jogo/cena.js'), import('../jogo/menu.js'),
    import('../jogo/som.js'), import('../jogo/celular.js'), import('../jogo/construtor.js'), import('../jogo/controles.js'), import('../jogo/ficha.js')]);
  if (minha !== montagem) return;
  som = S; ultimo = d; let diag = {}; let medida = null; let construtor = null;
  const jogo = raiz;
  raiz.addEventListener('pointerdown', () => som.iniciar(), { once: true });
  const nomeDe = (id) => { const it = ((motor.mapa() || {}).itens || []).find((i) => i.id === id); return it ? (NOMES_PERTO[it.modelo] || (it.luz ? 'Luz' : it.inventario ? 'Abrir' : 'Item')) : ''; };
  const botao = (b) => {
    if (b === 'A') { const id = ui.pertoAgora(); const p = id && motor.posicao(id); if (id && p) menus.abrir(id, p.x, p.y); }
    else if (b === 'B') { if (history.state && (history.state.menuJogo || history.state.folha)) history.back(); }
    else if (b === 'select') { const ordem = ['pepper', 'jean', 'livre']; camera(ordem[(ordem.indexOf(motor.modoCamera()) + 1) % 3]); }
    else if (b === 'start') celular.abrir();
  };
  motor = criarJogo(window.Phaser, raiz.querySelector('[data-mundo]'), { mapa: d.mapa,
    aoDiagnostico: (x) => { diag = x; if (medida) medida.amostras.push(x.fps); },
    // Uma pessoa abre a ficha dela (adendo 10, item 7); o celular dela, a tela dele (item 6); o resto, o menu do item.
    aoTocar: (id, sx, sy) => { if (id.startsWith('pessoa:')) { const q = id.slice(7); if (q === 'celular') ficha.celularDela(); else ficha.abrir(q); } else menus.abrir(id, sx, sy); },
    aoSoltar: async (id, x, y, espelhar, tirar) => { const c = await menus.agir({ acao: 'mover', item: id, op: tirar ? 'tirar' : 'soltar', valor: { x, y, espelhar } }); if (c) { motor.cancelarMover(); ui.movendo(false); } },
    aoSemCaminho: () => menus.aviso('Não dá pra ir por aí.'),
    aoAndou: (x, y, andar) => { enviar({ acao: 'jean', op: 'andar', valor: { x, y, andar } }).then((c) => { if (c && c.reacao) menus.aviso('Ela viu você!'); if (c) aplicar(c); }).catch((e) => menus.aviso(e.message || 'Não deu certo agora.', 'erro')); },
    aoPerto: (id, sx, sy) => ui.perto(id, sx, sy, nomeDe(id)),
    aoBotao: botao,
    aoJoy: (on, sx, sy, dx, dy) => ui.joy(on, sx, sy, dx, dy),
    aoConstrutor: (tipo, x, y) => construtor && construtor.evento(tipo, x, y) });
  menus = criarMenus({ raiz: jogo, motor, enviar, som });
  ui = criarControles({ raiz: jogo, motor, aoBotao: botao });
  construtor = criarConstrutor({ raiz: jogo, motor, enviar: (c) => menus.agir(c), aviso: menus.aviso });
  const folha = raiz.querySelector('[data-folha]');
  ficha = criarFicha({ folha, chamar: chamarComHora, agora: agoraMs, som, aviso: (t, k) => menus.aviso(t, k), antes: () => { if (celular && celular.aberta()) celular.fechar(true); } });
  if (modoDemo) window.jogoTeste = { motor, menus, get celular() { return celular; }, construtor, ficha };
  aplicar(d); offline(!!d.offline);
  // a câmera: seguir a Pepper (na casa dela), seguir o Jean (onde ele estiver) ou livre (DEC-176)
  async function verMapa(id) { if (id === mapaAtual && motor.mapa().id === id) return; mapaAtual = id; try { aplicar(await enviar({ acao: 'cena', mapa: id })); } catch (e) { menus.aviso(e.message || 'Sem conexão agora.', 'erro'); } }
  async function camera(modo) {
    motor.camera(modo); const j = (ultimo && ultimo.jean) || {};
    if (modo === 'pepper') await verMapa('casa-pepper'); else if (modo === 'jean' && j.mapa_id && !j.voando) await verMapa(j.mapa_id);
    if (modo === 'jean' && j.voando) menus.aviso('O Jean está viajando.'); if (modo === 'jean' && j.fora) menus.aviso('O Jean está fora de casa: ' + j.fora + '.');
    menus.aviso(modo === 'pepper' ? 'Seguindo a Pepper.' : modo === 'jean' ? 'Seguindo o Jean.' : 'Câmera livre.');
    enviar({ acao: 'jean', op: 'config', valor: { camera: modo } }).catch(() => {});
  }
  const cfg = (d.jean && d.jean.config) || {}; if (cfg.camera && cfg.camera !== 'pepper') camera(cfg.camera); ui.botoes(!!cfg.botoes);
  const zoomBotoes = (on) => { raiz.querySelector('[data-zoomcaixa]').hidden = !on; }; zoomBotoes(!!cfg.zoom_botoes);
  window.addEventListener('jogo-movendo', () => ui.movendo(true, () => motor.girar(), () => { motor.cancelarMover(); ui.movendo(false); }));
  const chip = () => { const p = (ultimo && ultimo.pepper) || {};
    raiz.querySelector('[data-hora]').textContent = horaEm('America/New_York');
    raiz.querySelector('[data-humor]').className = 'jogo__humor ' + HUMOR[humorDe(p.humor)]; };
  chip();
  relogio = setInterval(async () => { if (minha !== montagem) { pararMotor(); return; } chip();
    if (agoraMs() % 60000 < 15000) { try { aplicar(await enviar({ acao: 'cena' })); } catch (e) { /* tenta de novo no próximo minuto */ } } }, 15000);
  document.addEventListener('visibilitychange', aoVoltar); window.addEventListener('online', aoOnline);
  esvaziarFila();
  vigiarContexto(raiz, minha);

  const diagnostico = () => {
    const mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB' : 'o aparelho não informa';
    return `<p class="jogo__titulo">Diagnóstico</p><p class="jogo__texto">FPS agora: ${Math.round(diag.fps || 0)}</p>`
      + `<p class="jogo__texto">Luzes ativas: ${diag.luzes || 0} de ${diag.total || 0} acesas (máximo 8)</p><p class="jogo__texto">Memória: ${mem}</p>`
      + `<p class="jogo__texto2">${esc(diag.renderer || '')}, escala ${diag.escala || '?'}, tela do jogo ${diag.w || '?'} x ${diag.h || '?'}</p><p class="jogo__texto" data-medida></p>`
      + '<button class="jogo__linha" data-medir>Medir por 10 segundos</button>';
  };
  const ligarDiagnostico = (f) => f.querySelector('[data-medir]').addEventListener('click', () => { medida = { amostras: [] }; const alvo = f.querySelector('[data-medida]'); alvo.textContent = 'Medindo…';
    setTimeout(() => { const a = medida.amostras.filter((x) => x > 0); medida = null; if (!a.length) { alvo.textContent = 'Sem amostras.'; return; }
      const media = a.reduce((s, x) => s + x, 0) / a.length; alvo.textContent = `Média ${Math.round(media)} fps, mínima ${Math.round(Math.min(...a))} fps (${a.length} quadros).`; }, 10000); });
  // A primeira vez (I-pesquisa 1 e 2): a apresentação curta, que dá para pular, e logo a escolha dos avisos.
  const apresentacao = (primeira) => ui.apresentacao(() => { gravar(CHAVE_INTRO, true); enviar({ acao: 'jean', op: 'config', valor: { apresentacao: true } }).catch(() => {}); if (primeira) celular.escolherAvisos(); });
  celular = criarCelular({ folha, motor, chamar: chamarComHora, enviar: (c) => menus.agir(c), som, menus, ultimo: () => ultimo, camera, verMapa, diagnostico, ligarDiagnostico,
    reverApresentacao: () => apresentacao(false), api: endereco, aoBotoes: (on) => ui.botoes(on), aoZoomBotoes: zoomBotoes, agora: agoraMs, versao: VERSAO, aoAbas: notarAbas,
    pessoa: (nome) => ficha.abrir(nome), celularDela: () => ficha.celularDela(), admin: () => papel() === 'administrador', antes: () => { if (ficha.aberta()) ficha.fechar(true); },
    construir: async (id) => { await verMapa(id); construtor.abrir(); },
    tirar: (id) => { const g = (((ultimo || {}).casa || {}).guardados || []).find((x) => x.id === id); if (!g) return; motor.mover(g, true); ui.movendo(true, () => motor.girar(), () => { motor.cancelarMover(); ui.movendo(false); }); menus.aviso('Toque onde quer pôr.'); } });
  // A câmera sem pinça (rodada 9, adendo 3): o zoom em níveis inteiros e o "centralizar".
  raiz.querySelectorAll('[data-zoom]').forEach((b) => b.addEventListener('click', () => motor.zoom(Number(b.dataset.zoom))));
  raiz.querySelector('[data-centro]').addEventListener('click', () => motor.centralizar());
  raiz.querySelector('[data-celular]').addEventListener('click', (e) => { e.currentTarget.classList.remove('jogo__celular--novo'); celular.abrir(); });
  if (abaPendente) { celular.abrir(abaPendente); abaPendente = null; }
  else if (!ler(CHAVE_INTRO, false) && !cfg.apresentacao && raiz.querySelector('[data-app]').hidden) apresentacao(true);
  saberPapel();
}

// O WebGL perdido (I-pesquisa 3): no iPad e no iPhone, bloquear a tela ou ir para outro app pode levar o contexto. O jogo
// pausa ao perder; ao voltar, refaz a cena com o estado do servidor. Se o contexto não voltar em 3 segundos com o app à
// frente, refaz do mesmo jeito (o Phaser cria um contexto novo).
function vigiarContexto(raiz, minha) {
  const tela = raiz.querySelector('[data-mundo] canvas'); if (!tela) { requestAnimationFrame(() => { if (minha === montagem && raiz.querySelector('[data-mundo] canvas')) vigiarContexto(raiz, minha); }); return; }
  let perdido = false, espera = null;
  const refazer = () => { if (minha !== montagem || !casca) return; const pai = casca.parentElement; const app = casca.querySelector('[data-app]'); const aberto = app && !app.hidden;
    desmontarJogo(); garantirJogo(pai); if (aberto) window.dispatchEvent(new HashChangeEvent('hashchange')); };
  tela.addEventListener('webglcontextlost', (e) => { e.preventDefault(); perdido = true; if (motor) motor.pausar(true);
    const tentar = () => { if (document.visibilityState === 'visible' && perdido) { clearTimeout(espera); espera = setTimeout(() => { if (perdido) refazer(); }, 3000); } };
    tentar(); document.addEventListener('visibilitychange', tentar); }, false);
  tela.addEventListener('webglcontextrestored', () => { perdido = false; clearTimeout(espera); refazer(); }, false);
}

const JG = { tipo: 'jogo', titulo: 'Jogo', corpo: () => '' };
export default { JG };
