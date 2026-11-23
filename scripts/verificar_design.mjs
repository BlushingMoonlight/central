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
//
// Como rodar: node scripts/verificar_design.mjs   (a Action "Verificar design" roda em todo PR)
//             node scripts/verificar_design.mjs --estatico   (só os itens 1 e 2, sem navegador)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

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

// 3 a 8. No navegador
const estatico = process.argv.includes('--estatico');
let contas = { telas: 0, estados: 0 };
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
        const achados = await pagina.evaluate(() => {
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
        });
        for (const a of achados) erros.push(`${f}?estado=${est} @${largura}px: ${a}`);
      }
      if (largura === 390) contas.telas++;
    }
    await pagina.close();
  }
  await navegador.close();
}

if (erros.length) {
  const unicos = [...new Set(erros)];
  console.error(`Verificar design: ${unicos.length} problema(s)\n` + unicos.slice(0, 200).map((e) => '- ' + e).join('\n'));
  process.exit(1);
}
console.log(`Verificar design: tudo certo (${paginas.length} páginas, ${paresOk} pares de contraste` +
  (estatico ? ', sem navegador).' : `, ${contas.estados} estados em 390, 820 e 1024 px).`));
