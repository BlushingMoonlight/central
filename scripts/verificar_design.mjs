#!/usr/bin/env node
// Verificar o design da Central (direção A · Mensagens).
//
// O que faz: bloqueia (sai com erro) quando encontra, em assets/design/ e em prototipo/ (menos prototipo/direcoes/,
// que é o registro da etapa A):
//   1. valor fora dos tokens: cor ou medida escrita fora de assets/design/tokens.css (só 0, porcentagem e número sem unidade);
//   2. contraste abaixo de 4,5:1 nos pares de cor usados, no claro e no escuro (calculado de tokens.css);
//   3. alvo de toque menor que 44 px e texto menor que 12 px;
//   4. rolagem para o lado em 390, 820 e 1024 px;
//   5. mais de um botão principal (.botao--principal) visível por tela e por estado;
//   6. dia da semana escrito à mão (ele vem sempre de data-data);
//   7. emoji na interface;
//   8. palavras de bastidores nas falas da Pepper (.msg--ela): IA, modelo, prompt, sistema, n8n, workflow, Claude, OpenAI.
// Os itens 3 a 8 abrem cada tela em cada estado (?estado=) no Chromium do Playwright.
// O app (index.html e app/) passa pelas mesmas regras: o código não escreve cor nem style= (só classes de componentes.css),
// o index.html tem o noindex, e cada rota da entrega 1 é aberta em modo de demonstração (?demo=1, app/demo.js) nos estados
// normal, vazio, erro e carregando, em 390, 820 e 1024 px, e também tem de chegar ao fim sem erro de JavaScript.
// Exceções (não leem CSS): manifest.webmanifest (theme_color e background_color) e os ícones de app/icones/
// (gerados por scripts/gerar_icones.py), que usam os hex de tokens.css.
//
// Como rodar: node scripts/verificar_design.mjs   (a Action "Verificar design" roda em todo PR)
//             node scripts/verificar_design.mjs --estatico   (só os itens 1 e 2, sem navegador)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { servir } from './servidor.mjs';

const raiz = resolve(dirname(new URL(import.meta.url).pathname), '..');
const erros = [];
const ler = (p) => readFileSync(join(raiz, p), 'utf8');
function arquivos(dir, fim) {
  let l = [];
  for (const n of readdirSync(join(raiz, dir))) {
    const p = join(dir, n);
    if (p.startsWith('prototipo/direcoes')) continue;
    if (statSync(join(raiz, p)).isDirectory()) l = l.concat(arquivos(p, fim));
    else if (n.endsWith(fim)) l.push(p);
  }
  return l;
}
const paginas = arquivos('prototipo', '.html');

// 1. Valor fora dos tokens
const cor = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;
const medida = /(?<![\w-])(\d*\.?\d+)(px|rem|em|ms|s|vh|vw|pt)\b/g;
function conferirCss(nome, css) {
  css.split('\n').forEach((linha, i) => {
    if (cor.test(linha)) erros.push(`${nome}:${i + 1}: cor fora dos tokens: ${linha.trim().slice(0, 90)}`);
    for (const m of linha.matchAll(medida)) if (+m[1] !== 0) erros.push(`${nome}:${i + 1}: medida fora dos tokens (${m[0]})`);
  });
}
for (const f of arquivos('assets/design', '.css').filter((f) => !f.endsWith('tokens.css'))) conferirCss(f, ler(f));
for (const f of paginas) {
  const h = ler(f);
  for (const m of h.matchAll(/<style>([\s\S]*?)<\/style>/g)) conferirCss(f + ' <style>', m[1]);
  for (const m of h.matchAll(/style="([^"]*)"/g)) conferirCss(f + ' style=', m[1]);
  if (!h.includes('<meta name="robots" content="noindex, nofollow">')) erros.push(`${f}: falta o noindex`);
}

// 1b. O app: nada de cor nem style= no código; o noindex no index.html.
const appJs = ['index.html', 'config.js', 'sw.js', ...arquivos('app', '.js')];
for (const f of appJs) {
  ler(f).split('\n').forEach((linha, i) => {
    if (/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![\w/])|\brgba?\(|\bhsla?\(/.test(linha)) erros.push(`${f}:${i + 1}: cor fora dos tokens: ${linha.trim().slice(0, 90)}`);
    if (/style=|\.style\./.test(linha)) erros.push(`${f}:${i + 1}: estilo escrito no código (use as classes de componentes.css)`);
  });
}
if (!ler('index.html').includes('<meta name="robots" content="noindex, nofollow">')) erros.push('index.html: falta o noindex');

// 2. Contraste
const tokens = ler('assets/design/tokens.css');
const bloco = (re) => Object.fromEntries([...(tokens.match(re) || [''])[0].matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6})/g)].map((m) => [m[1], m[2]]));
const claro = bloco(/^:root \{[\s\S]*?\n\}/m);
const escuro = bloco(/:root\[data-theme="dark"\] \{[\s\S]*?\n\}/);
const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const razao = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const pares = [['texto', 'fundo'], ['texto', 'superficie'], ['texto', 'superficie-2'], ['texto-2', 'fundo'], ['texto-2', 'superficie'],
  ['texto-2', 'superficie-2'], ['destaque', 'fundo'], ['destaque', 'superficie'], ['sobre-destaque', 'destaque'], ['texto-ele', 'bolha-ele'],
  ['texto', 'bolha-ela'], ['perigo', 'fundo'], ['perigo', 'superficie'], ['atencao', 'superficie'], ['atencao', 'superficie-2'],
  ['certo', 'superficie'], ['sobre-camera', 'camera-fundo'], ['texto-2', 'bolha-ela']];
let paresOk = 0;
for (const [modo, t] of [['claro', claro], ['escuro', escuro]]) for (const [a, b] of pares) {
  if (!t[a] || !t[b]) { erros.push(`tokens.css (${modo}): falta --${a} ou --${b}`); continue; }
  const r = razao(t[a], t[b]);
  if (r < 4.5) erros.push(`contraste ${modo}: --${a} sobre --${b} = ${r.toFixed(2)}:1 (mínimo 4,5:1)`); else paresOk++;
}

// 3 a 8. No navegador (a mesma conferência para o protótipo e para o app)
function conferirTela() {
  const r = [];
  const visivel = (e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
  if (document.documentElement.scrollWidth > window.innerWidth + 1) r.push(`rolagem para o lado (${document.documentElement.scrollWidth}px)`);
  for (const e of document.querySelectorAll('a, button, select, textarea, input:not([type=radio]):not([type=checkbox]), label.marca')) {
    if (!visivel(e)) continue;
    const b = e.getBoundingClientRect();
    if (b.width < 44 || b.height < 44) r.push(`alvo menor que 44 px: "${(e.textContent || e.id).trim().slice(0, 30)}" (${Math.round(b.width)}x${Math.round(b.height)})`);
  }
  const semana = /\b(domingo|segunda|terça|quarta|quinta|sexta|sábado)(-feira)?\b/i;
  const emoji = /\p{Extended_Pictographic}/u;
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) {
    const t = n.textContent.trim(), el = n.parentElement;
    if (!t || !visivel(el)) continue;
    if (parseFloat(getComputedStyle(el).fontSize) < 12) r.push(`texto menor que 12 px: "${t.slice(0, 30)}"`);
    if (semana.test(t) && !el.closest('[data-data]')) r.push(`dia da semana escrito à mão: "${t.slice(0, 40)}"`);
    if (emoji.test(t)) r.push(`emoji: "${t.slice(0, 30)}"`);
  }
  const principais = [...document.querySelectorAll('.botao--principal')].filter(visivel).length;
  if (principais > 1) r.push(`${principais} botões principais visíveis`);
  const bastidor = /\b(IA|I\.A\.|inteligência artificial|modelo|prompt|sistema|n8n|workflow|Claude|OpenAI|GPT)\b/i;
  for (const m of document.querySelectorAll('.msg--ela')) if (bastidor.test(m.textContent)) r.push(`bastidor na fala dela: "${m.textContent.trim().slice(0, 40)}"`);
  return r;
}

const estatico = process.argv.includes('--estatico');
let contas = { telas: 0, estados: 0, app: 0 };
// As rotas do app da entrega 1 (docs/fluxo/arvore.md, "Ordem de implementação"), com ids dos dados de app/demo.js.
const ROTAS_APP = ['CV', 'CV1', 'CV2', 'CV3', 'K1', 'K2', 'K3', 'K4', 'VI0', 'VI1/casa', 'VI2/t-filtro', 'VI3', 'VI4', 'VI6',
  'AG0', 'AG1/c1', 'AG2', 'AG3/carla', 'AG4', 'FI0', 'FI1', 'FI1/saas', 'FI2/g1', 'FI3', 'FI4/a2', 'FI5', 'FI6', 'FI7', 'FI8', 'FI9',
  'PE1', 'PE4', 'PE5', 'AJ0', 'AJ1', 'AJ2', 'AJ3', 'PJ0', 'PJ1', 'PJ2', 'PJ3', 'PJ4', 'PJ5', 'PJ6', 'PJ7', 'PJ9', 'PJ10', 'PJ12', 'PJ13',
  'passo-1', 'passo-4', 'passo-5', 'passo-6', 'passo-7', 'entrar', 'esqueci'];
if (!estatico) {
  const { chromium } = createRequire(import.meta.url)('playwright');
  const navegador = await chromium.launch();
  for (const largura of [390, 820, 1024]) {
    const pagina = await navegador.newPage({ viewport: { width: largura, height: 900 } });
    for (const f of paginas) {
      const url = pathToFileURL(join(raiz, f)).href;
      await pagina.goto(url);
      const estados = await pagina.$$eval('[data-estado]', (l) => [...new Set(l.map((e) => e.dataset.estado))]);
      for (const est of estados.length ? estados : ['normal']) {
        if (estados.length) await pagina.goto(url + '?estado=' + est);
        if (largura === 390) contas.estados++;
        const achados = await pagina.evaluate(conferirTela);
        for (const a of achados) erros.push(`${f}?estado=${est} @${largura}px: ${a}`);
      }
      if (largura === 390) contas.telas++;
    }
    await pagina.close();
  }

  // O app em modo de demonstração, em cada rota da entrega 1.
  const servidor = await servir(raiz);
  for (const largura of [390, 820, 1024]) {
    const pagina = await navegador.newPage({ viewport: { width: largura, height: 900 } });
    const falhasJs = [];
    pagina.on('pageerror', (e) => falhasJs.push(e.message));
    for (const rota of ROTAS_APP) {
      for (const est of ['normal', 'vazio', 'erro', 'carregando']) {
        falhasJs.length = 0;
        const onde = `app #${rota}?estado=${est} @${largura}px`;
        await pagina.goto('about:blank');
        await pagina.goto(`${servidor.url}/index.html?demo=1&estado=${est}#${rota}`);
        const cod = rota.split('/')[0];
        try {
          await pagina.waitForFunction((c) => document.documentElement.dataset.tela === c && document.documentElement.dataset.fase,
            cod, { timeout: 5000 });
          if (est !== 'carregando') await pagina.waitForFunction(() => document.documentElement.dataset.fase !== 'carregando', null, { timeout: 5000 });
          await pagina.waitForTimeout(50);
        } catch (e) { erros.push(`${onde}: a tela não abriu (${await pagina.getAttribute('html', 'data-tela')}, ${await pagina.getAttribute('html', 'data-fase')})`); continue; }
        const fase = await pagina.getAttribute('html', 'data-fase');
        if ((est === 'normal' || est === 'vazio') && fase !== 'pronto') erros.push(`${onde}: devia abrir pronta, abriu "${fase}"`);
        if (largura === 390) contas.app++;
        for (const a of await pagina.evaluate(conferirTela)) erros.push(`${onde}: ${a}`);
        for (const m of falhasJs) erros.push(`${onde}: erro de JavaScript: ${m}`);
      }
    }
    await pagina.close();
  }
  servidor.fechar();
  await navegador.close();
}

if (erros.length) {
  const unicos = [...new Set(erros)];
  console.error(`Verificar design: ${unicos.length} problema(s)\n` + unicos.slice(0, 200).map((e) => '- ' + e).join('\n'));
  process.exit(1);
}
console.log(`Verificar design: tudo certo (${paginas.length} páginas, ${paresOk} pares de contraste` +
  (estatico ? ', sem navegador).' : `, ${contas.estados} estados em 390, 820 e 1024 px; app: ${ROTAS_APP.length} rotas, ${contas.app} casos em modo de demonstração, nas mesmas larguras).`));
