// Central — pedaços da interface. A mesma marcação do protótipo (scripts/gerar_prototipo.py), com as classes de
// assets/design/componentes.css. Nenhuma cor nem medida aqui: só classes.
import { hojeIso } from './api.js';

export const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro',
  'novembro', 'dezembro'];
const FUSO = 'America/Sao_Paulo';

// Data e hora no dia do Jean (America/Sao_Paulo).
export function diaDe(iso) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}
export function horaDe(iso) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
}
export const hoje = () => hojeIso();
export function somarDias(dia, n) {
  const [a, m, d] = dia.split('-').map(Number);
  const x = new Date(Date.UTC(a, m - 1, d + n));
  return x.toISOString().slice(0, 10);
}

// O dia da semana sai sempre da data (DEC-023), dentro de data-data.
export function data(dia, curto = false) {
  if (!dia) return '';
  dia = diaDe(dia);
  const [a, m, d] = dia.split('-').map(Number);
  const dt = new Date(a, m - 1, d);
  const texto = (curto ? '' : DIAS[dt.getDay()] + ', ') + d + ' de ' + MESES[m - 1];
  return `<span data-data="${dia}"${curto ? ' data-formato="curto"' : ''}>${texto}</span>`;
}
export const nomeMes = (anoMes) => MESES_LONGOS[Number(String(anoMes).slice(5, 7)) - 1] || '';
export function prazoTexto(prazo) {
  if (!prazo) return 'sem prazo';
  const h = hoje();
  if (prazo === h) return 'vence hoje';
  if (prazo < h) return 'venceu ' + data(prazo, true);
  return data(prazo);
}

const numero = (v, casas) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
export const reais = (v) => 'R$ ' + numero(v, 2);
export const dolares = (v, casas = 2) => 'US$ ' + numero(v, casas);
export const porcento = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + numero(Math.abs(v), 1) + '%';

export function item(titulo, { det = '', fim = '', ir = null, cls = '', acao = '' } = {}) {
  const abre = ir ? `<a class="item ${cls}" href="#${ir}">` : `<div class="item ${cls}">`;
  return `<li>${abre}<span class="item__texto"><strong>${titulo}</strong>`
    + (det ? `<span class="item__det">${det}</span>` : '') + '</span>'
    + (fim ? `<span class="item__fim">${fim}</span>` : '') + acao + (ir ? '</a>' : '</div>') + '</li>';
}
export const lista = (...itens) => '<ul class="lista">' + itens.join('') + '</ul>';

export function botao(texto, { ir = null, principal = false, leve = false, perigo = false, largo = false, attrs = '', tipo = 'button' } = {}) {
  const cls = 'botao' + (principal ? ' botao--principal' : '') + (leve ? ' botao--leve' : '') + (perigo ? ' botao--perigo' : '')
    + (largo ? ' botao--largo' : '');
  if (ir) return `<a class="${cls}" href="#${ir}"${attrs}>${texto}</a>`;
  return `<button class="${cls}" type="${tipo}"${attrs}>${texto}</button>`;
}
export const acoes = (...b) => '<div class="acoes">' + b.join('') + '</div>';

// campo(rótulo, id, {tipo, valor, erro, area, opcoes, nome, extra})
export function campo(rot, id, { tipo = 'text', valor = '', erro = '', area = false, opcoes = null, nome = '', extra = '' } = {}) {
  const n = nome ? ` name="${nome}"` : '';
  let ctl;
  if (area) ctl = `<textarea id="${id}"${n} rows="3"${extra}>${esc(valor)}</textarea>`;
  else if (opcoes) ctl = `<select id="${id}"${n}${extra}>` + opcoes.map(([v, t]) => `<option value="${esc(v)}"${v === valor ? ' selected' : ''}>${esc(t)}</option>`).join('') + '</select>';
  else ctl = `<input id="${id}"${n} type="${tipo}"${valor !== '' ? ` value="${esc(valor)}"` : ''}${extra}>`;
  return `<div class="campo${erro ? ' campo--erro' : ''}"><label for="${id}">${rot}</label>${ctl}`
    + `<span class="campo__erro"${erro ? '' : ' hidden'}>${esc(erro)}</span></div>`;
}
export function marcarErro(raiz, id, texto) {
  const c = raiz.querySelector('#' + id)?.closest('.campo');
  if (!c) return;
  c.classList.toggle('campo--erro', !!texto);
  const s = c.querySelector('.campo__erro');
  s.textContent = texto || '';
  s.hidden = !texto;
}

export const vazio = (titulo, texto = '', principal = '') =>
  `<div class="vazio"><strong>${titulo}</strong>${texto}</div>` + (principal ? acoes(principal) : '');
export const aviso = (tipo, forte, texto = '', papel = 'status') =>
  `<div class="aviso${tipo ? ' aviso--' + tipo : ''}" role="${papel}"><strong>${forte}</strong>${texto ? ' ' + texto : ''}</div>`;

export const CARREGANDO = '<div class="carregando" role="status" aria-label="Carregando"><span></span><span></span><span></span></div>'
  + '<p class="pequeno">Carregando…</p>';
export const ERRO = '<div class="aviso aviso--erro" role="alert"><strong>Não deu para carregar.</strong> Confira a internet e tente '
  + 'de novo.</div>' + acoes('<button class="botao botao--principal" type="button" data-tentar>Tentar de novo</button>');

// Um bloco de campos que aparece no primeiro toque do botão e é mandado no segundo (sem botão novo).
export const editor = (id, campos) => `<div id="${id}" hidden>${campos}</div>`;

// ---------- ações ----------
function mostrarFalha(b, e) {
  const perto = b.closest('.acoes, li') || b;
  let a = perto.nextElementSibling;
  if (!a || !a.matches('[data-falha]')) {
    a = document.createElement('div');
    a.className = 'aviso aviso--erro';
    a.setAttribute('role', 'alert');
    a.dataset.falha = '';
    perto.after(a);
  }
  const texto = e && e.tipo === 'servidor' && e.message ? esc(e.message) : 'Confira a internet e tente de novo.';
  a.innerHTML = '<strong>Não deu para salvar.</strong> ' + texto;
}

// Liga um toque a uma ação. Enquanto ela corre, o botão fica parado; se falhar, aparece o aviso logo abaixo.
export function aoTocar(raiz, seletor, fn) {
  raiz.querySelectorAll(seletor).forEach((b) => b.addEventListener('click', async (ev) => {
    ev.preventDefault();
    if (b.getAttribute('aria-disabled') === 'true') return;
    b.setAttribute('aria-disabled', 'true');
    try { await fn(b, ev); } catch (e) {
      if (e && e.tipo === 'sessao') { location.hash = '#entrar'; return; }
      mostrarFalha(b, e);
    } finally { b.removeAttribute('aria-disabled'); }
  }));
}

// O botão abre o editor (data-editor="id") no primeiro toque e manda os valores no segundo.
export function comEditor(raiz, seletor, fn) {
  aoTocar(raiz, seletor, async (b) => {
    const ed = raiz.querySelector('#' + b.dataset.editor);
    if (ed.hidden) { ed.hidden = false; ed.querySelector('input, textarea, select')?.focus(); return; }
    const v = {};
    ed.querySelectorAll('[name]').forEach((c) => {
      if (c.type === 'checkbox') v[c.name] = c.checked;
      else if (c.type === 'radio') { if (c.checked) v[c.name] = c.value; } else v[c.name] = c.value;
    });
    await fn(v, b);
  });
}

// O perigoso pede um segundo toque (DEC-022): o primeiro mostra o aviso, o segundo faz.
export function comConfirmacao(raiz, seletor, fn) {
  aoTocar(raiz, seletor, async (b) => {
    if (!b.dataset.confirmando) {
      b.dataset.confirmando = '1';
      const a = document.createElement('div');
      a.className = 'aviso aviso--atencao';
      a.setAttribute('role', 'alert');
      a.innerHTML = '<strong>Toque de novo para confirmar.</strong> Não dá para desfazer.';
      (b.closest('.acoes') || b).after(a);
      return;
    }
    await fn(b);
  });
}

export const ir = (rota) => { location.hash = '#' + rota; };
