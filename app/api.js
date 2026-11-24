import { adaptar } from './adaptar.js';
// Central — a ponte com o servidor. Todas as chamadas são POST <api>/<caminho>, JSON, com o token da sessão
// (menos as de entrada). O endereço vem de config.js (window.CENTRAL.api), nunca escrito aqui.
// Com ?demo=1, as respostas vêm de app/demo.js (dados inventados), e ?estado=vazio|erro|carregando|salario muda o caso.

const busca = new URLSearchParams(location.search);
export const modoDemo = busca.get('demo') === '1';
export const estadoDemo = busca.get('estado') || 'normal';

const CHAVE_TOKEN = 'central-token';
const CHAVE_JA_ENTROU = 'central-ja-entrou';
const CHAVE_APARELHO = 'central-aparelho';

function ler(chave) { try { return localStorage.getItem(chave) || ''; } catch (e) { return ''; } }
function gravar(chave, valor) {
  try { valor ? localStorage.setItem(chave, valor) : localStorage.removeItem(chave); } catch (e) { /* sem armazenamento: segue sem lembrar */ }
}

export function lerToken() { return modoDemo ? (estadoDemo === 'sem_sessao' ? '' : 'demo') : ler(CHAVE_TOKEN); }
export function gravarToken(t) { if (!modoDemo) gravar(CHAVE_TOKEN, t); if (t) gravar(CHAVE_JA_ENTROU, '1'); }
export const temSessao = () => !!lerToken();
export const jaEntrou = () => !!ler(CHAVE_JA_ENTROU);

export function endereco() { return String((window.CENTRAL && window.CENTRAL.api) || '').replace(/\/+$/, ''); }
export const configurado = () => modoDemo || !!endereco();

// O aparelho: um id guardado nele e um nome simples (iPhone, iPad, Mac).
export function aparelho() {
  let id = ler(CHAVE_APARELHO);
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
    gravar(CHAVE_APARELHO, id);
  }
  const ua = navigator.userAgent;
  const nome = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'iPad'
    : /iPhone/.test(ua) ? 'iPhone' : /Macintosh/.test(ua) ? 'Mac' : /Android/.test(ua) ? 'Android' : 'Navegador';
  return { id, nome };
}

// O dia de hoje do Jean (America/Sao_Paulo). No modo de demonstração, o "hoje" dos dados inventados.
export function hojeIso() {
  if (modoDemo) return '2026-11-23';
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

// tipo: 'rede' (sem internet ou servidor fora), 'sessao' (401: volta à entrada), 'servidor' ({ok:false, erro}).
export class ErroApi extends Error {
  constructor(texto, tipo) { super(texto); this.tipo = tipo; }
}

export async function chamar(caminho, corpo = {}) {
  if (modoDemo) {
    const demo = await import('./demo.js');
    const r = await demo.responder(caminho, corpo, estadoDemo);
    if (r === 'rede') throw new ErroApi('', 'rede');
    if (!r.ok) throw new ErroApi(r.erro || '', 'servidor');
    return r;
  }
  if (!endereco()) throw new ErroApi('', 'rede');
  const cabecalhos = { 'Content-Type': 'application/json' };
  const token = lerToken();
  if (token) cabecalhos.Authorization = 'Bearer ' + token;
  let resposta;
  try {
    resposta = await fetch(endereco() + '/' + caminho, { method: 'POST', headers: cabecalhos, body: JSON.stringify(corpo), cache: 'no-store' });
  } catch (e) {
    throw new ErroApi('', 'rede');
  }
  // Só um 401 da sessão principal tira o Jean da conta. Um 401 do painel (DEC-123) vira um erro da tela: o painel usa a
  // mesma sessão (DEC-116), e uma recusa ali nunca apaga o token da conta.
  if (resposta.status === 401) {
    if (caminho.startsWith('painel/')) throw new ErroApi('O painel não abriu. Volte e toque em "Painel do Jean" de novo.', 'servidor');
    gravar(CHAVE_TOKEN, ''); throw new ErroApi('', 'sessao');
  }
  let dados = null;
  try { dados = await resposta.json(); } catch (e) { /* resposta sem JSON */ }
  if (!dados) throw new ErroApi('', 'rede');
  if (!resposta.ok || !dados.ok) throw new ErroApi(dados.erro || '', 'servidor');
  // O servidor devolve o id do aparelho (na entrada e no primeiro acesso): fica sendo o id deste aparelho, para o próximo
  // pedido (com o código) achar o mesmo aparelho.
  if (typeof dados.aparelho_id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dados.aparelho_id)) {
    gravar(CHAVE_APARELHO, dados.aparelho_id);
  }
  return adaptar(caminho, corpo, dados);
}
