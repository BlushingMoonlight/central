// Central — o app (PWA). Abriu, é o jogo (rodada 9, parte I, DEC-199): a casa dela em tela cheia, e tudo o que o app
// antigo fazia é um app do celular do Jean, aberto numa janela por cima do jogo, que segue vivo por baixo. As rotas
// continuam por hash com o código da tela (#CV, #VI0, #VI2/<id>, #AG0, #FI0, #PE1, #AJ0, #PJ0...); #JG é o jogo sem
// janela e #JG/<aba> abre o celular nessa aba. Só a entrada (login, criar conta) fica fora do jogo, no estilo dele.
import { configurado, temSessao, jaEntrou, modoDemo, papel } from './api.js';
import { esc, CARREGANDO, ERRO } from './ui.js';
import { lerRota } from './rota.js';
import { mandarFila } from './fila.js';
import { VERSAO } from './versao.js';
import { renovarAvisos } from './midia.js';
import conversa from './conversa.js';
import captura from './captura.js';
import entrada from './entrada.js';
import vida from './vida.js';
import agenda from './agenda.js';
import financas from './financas.js';
import pessoas from './pessoas.js';
import ajustes from './ajustes.js';
import painel from './painel.js';
import jogo, { garantirJogo, desmontarJogo, janelaDoApp, celularNaAba, saberPapel } from './jogo.js';

const TELAS = { ...conversa, ...captura, ...entrada, ...vida, ...agenda, ...financas, ...pessoas, ...ajustes, ...painel, ...jogo };

let geracao = 0;
let anterior = 'CV';       // a tela de antes da captura (Cancelar e Voltar levam para lá)

const valor = (v, ...a) => (typeof v === 'function' ? v(...a) : v);

// A janela de um app (o mesmo conteúdo do app antigo, nas cores do jogo): o topo com a volta e o título. A volta de um
// app de primeiro nível é o celular (#JG/celular), como a tela de início de um telefone.
function quadroApp(t, d, args, conteudo) {
  const tipo = t.tipo;
  const titulo = esc(valor(t.titulo, d, args));
  let esq;
  if (tipo === 'captura') esq = `<a href="#${anterior}">Cancelar</a>`;
  else { const v = valor(t.voltar, d, args); esq = v ? `<a href="#${v[0]}">‹ ${esc(v[1])}</a>` : '<a href="#JG/celular">‹ Celular</a>'; }
  const dir = tipo === 'primeiro' || tipo === 'filho' ? '<a href="#K1">Capturar</a>' : '';
  const sub = d && t.sub ? valor(t.sub, d) : '';
  const topo = `<header class="topo"><span class="topo__esq">${esq}</span><div class="topo__titulo">${titulo}${sub ? `<span class="topo__sub">${sub}</span>` : ''}</div><span class="topo__dir">${dir}</span></header>`;
  const oculto = `<h1 class="oculto">${titulo}</h1>`;
  const conv = t.conversa && conteudo !== CARREGANDO && conteudo !== ERRO;
  const main = t.conversa ? `<main class="conversa-tela">${oculto}${conv ? `<div class="conversa">${conteudo}</div>` : conteudo}</main>`
    : `<main class="conteudo">${oculto}${conteudo}</main>`;
  const passo = tipo === 'passo';
  return `<div class="tela${passo ? ' tela--passo' : ''}">${topo}${main}${t.rodape && conv ? t.rodape : ''}</div>`;
}

// A entrada: a janela escura de borda dourada do jogo (I1), sem o jogo por trás.
function quadroEntrada(t, d, args, conteudo) {
  const v = valor(t.voltar, d, args);
  const esq = v ? `<a href="#${v[0]}">‹ ${esc(v[1])}</a>` : '';
  return `<div class="tela tela--passo tela--jogo"><header class="topo"><span class="topo__esq">${esq}</span><div class="topo__titulo">Central</div><span class="topo__dir"></span></header>`
    + `<main class="conteudo"><div class="janela-jogo">${conteudo}</div></main></div>`;
}

function inicioSemSessao() {
  if (jaEntrou()) return 'entrar';
  const instalado = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  return instalado || !/iPhone|iPad/.test(navigator.userAgent) ? 'passo-4' : 'passo-1';
}

async function mostrar() {
  const g = ++geracao;
  const html = document.documentElement;
  const raiz = document.getElementById('app');
  // O código da tela e um id só, com barras ou não (app/rota.js, DEC-140). Sem código conhecido: o jogo.
  const { cod, args } = lerRota(location.hash, TELAS);
  const t = TELAS[cod];
  html.dataset.tela = cod;
  html.dataset.fase = 'carregando';
  if (!configurado()) {
    desmontarJogo();
    raiz.innerHTML = quadroEntrada({}, null, [], ERRO);
    raiz.querySelector('[data-tentar]').addEventListener('click', () => location.reload());
    html.dataset.fase = 'erro';
    return;
  }
  if (t.tipo !== 'entrada' && !temSessao()) { location.replace('#' + inicioSemSessao()); return; }
  // O painel de administrador é invisível para o jogador comum (DEC-200): pela URL direta, volta ao jogo (e o servidor
  // recusa de qualquer jeito). Sem o papel guardado ainda, pergunta antes.
  if (t.admin) { const p = papel() || await saberPapel(); if (g !== geracao) return; if (p !== 'administrador') { location.replace('#JG'); return; } }
  if (!cod.startsWith('K') && t.tipo !== 'entrada') anterior = [cod, ...args].map(encodeURIComponent).join('/');
  document.title = (t.tipo === 'entrada' ? 'Central' : valor(t.titulo, null, args) + ' · Central');

  if (t.tipo === 'entrada') { desmontarJogo(); await desenhar(t, args, g, raiz, (d, c) => quadroEntrada(t, d, args, c)); return; }

  // Tudo o mais mora no jogo. O jogo carrega por baixo, sem segurar a janela do app (o essencial primeiro, I1).
  const pronto = garantirJogo(raiz, { atual: () => g === geracao, fase: (f) => { if (g === geracao && cod === 'JG') html.dataset.fase = f; } });
  if (cod === 'JG') { janelaDoApp(null); if (args[0]) celularNaAba(args[0]); html.dataset.fase = await pronto; return; }
  const janela = janelaDoApp(t);
  await desenhar(t, args, g, janela, (d, c) => quadroApp(t, d, args, c));
}

// Carrega e desenha uma tela (no lugar dado), com o "carregando", o erro com "Tentar de novo" e o "depois" da tela.
async function desenhar(t, args, g, lugar, quadro) {
  const html = document.documentElement;
  const ctx = { args, atual: () => g === geracao, recarregar: () => (g === geracao ? mostrar() : null), anterior: () => anterior };
  let d = null;
  if (t.carregar) {
    lugar.innerHTML = quadro(null, CARREGANDO);
    try { d = await t.carregar(args); } catch (e) {
      if (g !== geracao) return;
      if (e && e.tipo === 'sessao') { location.replace('#entrar'); return; }
      lugar.innerHTML = quadro(null, ERRO);
      lugar.querySelector('[data-tentar]').addEventListener('click', () => mostrar());
      html.dataset.fase = 'erro';
      return;
    }
    if (g !== geracao) return;
  }
  lugar.innerHTML = quadro(d, t.corpo(d, args, ctx));
  if (t.titulo && typeof t.titulo === 'function' && d) document.title = valor(t.titulo, d, args) + ' · Central';
  if (!t.conversa) { lugar.scrollTop = 0; window.scrollTo(0, 0); }
  try { t.depois && t.depois(lugar, d, ctx); } finally { if (g === geracao) html.dataset.fase = 'pronto'; }
}

// A versão nova (I-pesquisa 3): conferida só na abertura, antes de qualquer ação. O service worker novo espera; o app
// pede para ele assumir e recarrega uma vez, nunca no meio de uma ação (sem o skipWaiting às cegas).
async function conferirVersao() {
  if (modoDemo || !('serviceWorker' in navigator)) return;
  try {
    const r = await fetch('versao.json', { cache: 'no-store' }); const v = (await r.json()).versao;
    if (!(Number(v) > VERSAO)) return;
    const jaTentou = sessionStorage.getItem('central-atualizando') === String(v); if (jaTentou) return; sessionStorage.setItem('central-atualizando', String(v));
    const reg = await navigator.serviceWorker.getRegistration(); if (!reg) { location.reload(); return; }
    await reg.update();
    const nova = reg.waiting || reg.installing; if (!nova) { location.reload(); return; }
    navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
    const pular = (w) => w.postMessage({ tipo: 'pular' });
    if (nova.state === 'installed') pular(nova); else nova.addEventListener('statechange', () => { if (nova.state === 'installed') pular(nova); });
  } catch (e) { /* sem rede ou sem o arquivo: segue com esta versão */ }
}

document.documentElement.dataset.appJogo = '';   // o fundo da página é o do jogo (DEC-199)
window.addEventListener('hashchange', mostrar);
window.addEventListener('online', () => mandarFila());
conferirVersao();
mostrar();
if (configurado() && temSessao()) { mandarFila(); setTimeout(renovarAvisos, 5000); }
if ('serviceWorker' in navigator && !modoDemo) navigator.serviceWorker.register('sw.js').catch(() => {});
