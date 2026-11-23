// Central — o app (PWA). Rotas por hash com o código da tela (#CV, #VI0, #VI2/<id>, #AG0, #FI0, #PE1, #AJ0, #PJ0...).
// Monta a moldura da tela (topo, seções) com a mesma marcação do protótipo e preenche com os dados da API.
// Só as telas da entrega 1; as outras continuam só no protótipo (prototipo/).
import { configurado, temSessao, jaEntrou, modoDemo } from './api.js';
import { esc, CARREGANDO, ERRO } from './ui.js';
import { mandarFila } from './fila.js';
import conversa from './conversa.js';
import captura from './captura.js';
import entrada from './entrada.js';
import vida from './vida.js';
import agenda from './agenda.js';
import financas from './financas.js';
import pessoas from './pessoas.js';
import ajustes from './ajustes.js';
import painel from './painel.js';

const TELAS = { ...conversa, ...captura, ...entrada, ...vida, ...agenda, ...financas, ...pessoas, ...ajustes, ...painel };
const SECOES = [['CV', 'Conversa'], ['VI0', 'Vida'], ['AG0', 'Agenda'], ['FI0', 'Finanças'], ['PE1', 'Pessoas']];

try { const m = localStorage.getItem('central-modo'); if (m) document.documentElement.dataset.theme = m; } catch (e) { /* segue o aparelho */ }

let geracao = 0;
let anterior = 'CV';       // a tela de antes da captura (Cancelar e Voltar levam para lá)

const valor = (v, ...a) => (typeof v === 'function' ? v(...a) : v);

function quadro(t, d, args, conteudo) {
  const tipo = t.tipo;
  const titulo = esc(valor(t.titulo, d, args));
  let esq = '';
  if (tipo === 'primeiro') esq = '<a href="#AJ0">Ajustes</a>';
  else if (tipo === 'captura') esq = `<a href="#${anterior}">Cancelar</a>`;
  else { const v = valor(t.voltar, d, args); if (v) esq = `<a href="#${v[0]}">‹ ${esc(v[1])}</a>`; }
  const dir = tipo === 'primeiro' || tipo === 'filho' ? '<a href="#K1">Capturar</a>' : '';
  const sub = d && t.sub ? valor(t.sub, d) : '';
  const meio = tipo === 'entrada' ? 'Central' : titulo + (sub ? `<span class="topo__sub">${sub}</span>` : '');
  const topo = `<header class="topo"><span class="topo__esq">${esq}</span><div class="topo__titulo">${meio}</div><span class="topo__dir">${dir}</span></header>`;
  const oculto = ['primeiro', 'filho', 'painel', 'captura'].includes(tipo) ? `<h1 class="oculto">${titulo}</h1>` : '';
  const conv = t.conversa && conteudo !== CARREGANDO && conteudo !== ERRO;
  const main = t.conversa ? `<main class="conversa-tela">${oculto}${conv ? `<div class="conversa">${conteudo}</div>` : conteudo}</main>`
    : `<main class="conteudo">${oculto}${conteudo}</main>`;
  const nav = (tipo === 'primeiro' || tipo === 'filho') && t.secao ? '<nav class="secoes" aria-label="Seções">'
    + SECOES.map(([c, n]) => `<a href="#${c}"${c === t.secao ? ' aria-current="page"' : ''}>${n}</a>`).join('') + '</nav>' : '';
  const passo = tipo === 'passo' || tipo === 'entrada';
  return `<div class="tela${passo ? ' tela--passo' : ''}">${topo}${main}${t.rodape && conv ? t.rodape : ''}${nav}</div>`;
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
  const partes = decodeURIComponent(location.hash.slice(1)).split('/');
  const cod = TELAS[partes[0]] ? partes[0] : 'CV';
  const args = partes.slice(1);
  const t = TELAS[cod];
  html.dataset.tela = cod;
  html.dataset.fase = 'carregando';
  if (!configurado()) {
    raiz.innerHTML = quadro({ tipo: 'entrada' }, null, [], ERRO);
    raiz.querySelector('[data-tentar]').addEventListener('click', () => location.reload());
    html.dataset.fase = 'erro';
    return;
  }
  if (t.tipo !== 'entrada' && !temSessao()) { location.replace('#' + inicioSemSessao()); return; }
  if (!cod.startsWith('K') && t.tipo !== 'entrada') anterior = [cod, ...args].map(encodeURIComponent).join('/');
  document.title = (t.tipo === 'entrada' ? 'Central' : valor(t.titulo, null, args) + ' · Central');
  const ctx = { args, atual: () => g === geracao, recarregar: () => (g === geracao ? mostrar() : null), anterior: () => anterior };
  let d = null;
  if (t.carregar) {
    raiz.innerHTML = quadro(t, null, args, CARREGANDO);
    try { d = await t.carregar(args); } catch (e) {
      if (g !== geracao) return;
      if (e && e.tipo === 'sessao') { location.replace('#entrar'); return; }
      raiz.innerHTML = quadro(t, null, args, ERRO);
      raiz.querySelector('[data-tentar]').addEventListener('click', () => mostrar());
      html.dataset.fase = 'erro';
      return;
    }
    if (g !== geracao) return;
  }
  raiz.innerHTML = quadro(t, d, args, t.corpo(d, args, ctx));
  if (t.titulo && typeof t.titulo === 'function' && d) document.title = valor(t.titulo, d, args) + ' · Central';
  if (!t.conversa) window.scrollTo(0, 0);
  try { t.depois && t.depois(raiz, d, ctx); } finally { if (g === geracao) html.dataset.fase = 'pronto'; }
}

window.addEventListener('hashchange', mostrar);
window.addEventListener('online', () => mandarFila());
mostrar();
if (configurado() && temSessao()) mandarFila();
if ('serviceWorker' in navigator && !modoDemo) navigator.serviceWorker.register('sw.js').catch(() => {});
