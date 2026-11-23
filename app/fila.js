// Central — a fila do aparelho (DEC-006). Sem internet, o que foi capturado (e as mensagens) espera no IndexedDB, com
// a hora da captura, e sobe sozinho quando a conexão volta (evento "online") e ao abrir o app.
import { chamar } from './api.js';

const BANCO = 'central';
const LOJA = 'fila';
let memoria = []; // se o IndexedDB não existir (janela privada), a fila fica só na memória
let proximoId = 1;

function abrir() {
  return new Promise((ok, falha) => {
    if (!('indexedDB' in window)) { falha(new Error('sem IndexedDB')); return; }
    const r = indexedDB.open(BANCO, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(LOJA, { keyPath: 'id', autoIncrement: true });
    r.onsuccess = () => ok(r.result);
    r.onerror = () => falha(r.error);
  });
}

async function comLoja(modo, fn) {
  const banco = await abrir();
  return new Promise((ok, falha) => {
    const tx = banco.transaction(LOJA, modo);
    const pedido = fn(tx.objectStore(LOJA));
    tx.oncomplete = () => { banco.close(); ok(pedido && pedido.result); };
    tx.onerror = () => { banco.close(); falha(tx.error); };
  });
}

// item: {caminho, corpo, rotulo, criada_em}
export async function guardar(item) {
  try { await comLoja('readwrite', (l) => l.add(item)); } catch (e) { memoria.push({ ...item, id: 'm' + proximoId++ }); }
  avisarMudanca();
}
export async function listar() {
  let l = [];
  try { l = (await comLoja('readonly', (s) => s.getAll())) || []; } catch (e) { /* sem IndexedDB */ }
  return l.concat(memoria).sort((a, b) => String(a.criada_em).localeCompare(String(b.criada_em)));
}
async function tirar(id) {
  if (String(id).startsWith('m')) { memoria = memoria.filter((i) => i.id !== id); return; }
  try { await comLoja('readwrite', (l) => l.delete(id)); } catch (e) { /* já saiu */ }
}

let mandando = false;
// Manda o que estiver na fila, na ordem da captura. Para no primeiro erro (tenta de novo na próxima vez).
export async function mandarFila() {
  if (mandando || navigator.onLine === false) return;
  mandando = true;
  let mandou = false;
  try {
    for (const i of await listar()) {
      try { await chamar(i.caminho, i.corpo); await tirar(i.id); mandou = true; } catch (e) { break; }
    }
  } finally { mandando = false; }
  if (mandou) {
    if (!(await listar()).length && ultimoResultado) ultimoResultado = 'recebido';
    avisarMudanca();
  }
}

const ouvintes = new Set();
export const aoMudar = (fn) => { ouvintes.add(fn); return () => ouvintes.delete(fn); };
function avisarMudanca() { ouvintes.forEach((fn) => { try { fn(); } catch (e) { /* tela já saiu */ } }); }

// O resultado da última captura, para a tela Recebido (K4): 'recebido', 'fila' (sem internet) ou 'erro'.
export let ultimoResultado = null;

export async function enviarCaptura(corpo, rotulo) {
  const i = { caminho: 'captura', corpo, rotulo, criada_em: corpo.capturada_em };
  if (navigator.onLine === false) { await guardar(i); ultimoResultado = 'fila'; return; }
  try {
    await chamar('captura', corpo);
    ultimoResultado = 'recebido';
  } catch (e) {
    if (e.tipo === 'sessao') throw e;
    await guardar(i);
    ultimoResultado = e.tipo === 'rede' ? 'fila' : 'erro';
  }
}
