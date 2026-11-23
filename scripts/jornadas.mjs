#!/usr/bin/env node
// Percorrer as jornadas da Central tocando no protótipo.
//
// O que faz: abre o protótipo no Chromium (Playwright), faz cada jornada de docs/fluxo/jornadas.md (central-sistema)
// tocando nos botões e links pelo nome, conta os toques como o fluxo conta (cada toque, escrever conta 1, segurar e
// soltar conta 1, o toque no push conta 1) e confere a conta e a tela de chegada. Sai com erro se alguma não bater.
//
// Como rodar: node scripts/jornadas.mjs
import { join, dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const raiz = resolve(dirname(new URL(import.meta.url).pathname), '..');
const url = (p) => pathToFileURL(join(raiz, 'prototipo', p)).href;
const CV = 'conversa/cv.html';
const J = [
  ['1. Foto de nota fiscal', 2, 'K4', [['toque', 'Capturar'], ['toque', 'Tirar a foto']]],
  ['2. Áudio solto (da Conversa)', 1, 'CV', [['toque', 'Áudio']]],
  ['3. Cobrança: abrir o push e aceitar', 2, 'CV', [['push'], ['toque', 'Aceitar']]],
  ['4. Mensagem de madrugada', 1, 'CV', [['push']]],
  ['5. "O que você está fazendo?"', 2, 'CV', [['escrever', '#msg', 'o que você está fazendo?'], ['toque', 'Enviar']]],
  ['6. Pagar o salário', 3, 'PE1', [['toque', 'Pessoas'], ['estado', 'salario'], ['toque', 'Pagar o salário'], ['toque', 'Confirmar']]],
  ['7. Dar um presente', 4, 'PE1', [['toque', 'Pessoas'], ['toque', 'Dar um presente'], ['escrever', '#pr', 'jantar japonês para ela e a Morgan, hoje às 20h'], ['toque', 'Enviar']]],
  ['8. Fechar o aumento', 1, 'CV', [['toque', 'Aceitar']]],
  ['9a. Pedir uma função nova', 2, 'CV', [['escrever', '#msg', 'me ajuda a acompanhar minha natação'], ['toque', 'Enviar']]],
  ['9b. Marcar o pedido como pronto', 4, 'PJ10', [['toque', 'Ajustes'], ['toque', 'Painel do Jean'], ['toque', 'Pedidos de função'], ['toque', 'Pronto']]],
  ['10. Ver a carteira dela', 3, 'PJ7', [['toque', 'Ajustes'], ['toque', 'Painel do Jean'], ['toque', 'Carteira e conta']]],
  ['11. O Jean sumiu: ler a mensagem', 1, 'CV', [['push']]],
  ['14. Aprovar o orçamento de viagem', 3, 'PE6', [['toque', 'Pessoas'], ['toque', 'Despesas de trabalho'], ['toque', 'Aprovar']]],
  ['15. Viagem de presente', 4, 'PE1', [['toque', 'Pessoas'], ['toque', 'Dar um presente'], ['escrever', '#pr', 'fim de semana na praia para ela e a Morgan'], ['toque', 'Enviar']]],
  ['16 e 18. Uma mensagem', 2, 'CV', [['escrever', '#msg', 'vai e paga com o seu dinheiro'], ['toque', 'Enviar']]],
  ['Árvore: o que precisa de você hoje', 1, 'VI0', [['toque', 'Vida']]],
  ['Árvore: tarefa urgente feita', 2, 'VI0', [['toque', 'Vida'], ['toque', 'Feito']]],
  ['Árvore: agenda', 1, 'AG0', [['toque', 'Agenda']]],
  ['Árvore: gasto do mês', 1, 'FI0', [['toque', 'Finanças']]],
  ['Árvore: assinaturas', 2, 'FI3', [['toque', 'Finanças'], ['toque', 'Assinaturas']]],
  ['Árvore: feed dela', 2, 'PE2', [['toque', 'Pessoas'], ['toque', 'Feed dela']]],
  ['Árvore: abrir o painel', 2, 'PJ0', [['toque', 'Ajustes'], ['toque', 'Painel do Jean']]],
];
const { chromium } = createRequire(import.meta.url)('playwright');
const nav = await chromium.launch();
const p = await nav.newPage({ viewport: { width: 390, height: 844 } });
const falhas = [];
for (const [nome, esperado, chegada, passos] of J) {
  await p.goto(url(CV));
  let toques = 0;
  try {
    for (const [tipo, a, b] of passos) {
      if (tipo === 'push') toques++;
      else if (tipo === 'estado') await p.goto(p.url().split('?')[0] + '?estado=' + a);
      else if (tipo === 'escrever') { await p.locator(a).fill(b); toques++; }
      else {
        const exato = new RegExp('^\\s*' + a + '\\s*$');
        const botoes = p.locator('a:visible, button:visible');
        let alvo = botoes.filter({ hasText: exato }).first();
        if (!(await alvo.count())) alvo = botoes.filter({ has: p.locator('strong', { hasText: exato }) }).first();
        await alvo.click({ timeout: 3000 });
        await p.waitForLoadState();
        toques++;
      }
    }
    const tela = await p.getAttribute('html', 'data-tela');
    const ok = toques === esperado && tela === chegada;
    console.log(`${ok ? 'ok   ' : 'FALHA'} ${nome}: ${toques} toques (fluxo: ${esperado}), chegou em ${tela}`);
    if (!ok) falhas.push(nome);
  } catch (e) { console.log(`FALHA ${nome}: ${e.message.split('\n')[0]}`); falhas.push(nome); }
}
await nav.close();
if (falhas.length) { console.error(`${falhas.length} jornada(s) não bateram.`); process.exit(1); }
console.log(`Jornadas: as ${J.length} bateram com a conta do fluxo.`);
