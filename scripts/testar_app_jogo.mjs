#!/usr/bin/env node
// O app vira o jogo (rodada 9, parte I, I4; DEC-199 a DEC-202), em modo de demonstração (?demo=1), no Chromium do Playwright:
// 1. a auditoria: cada tela do app antigo abre dentro do jogo, na janela do app (com o jogo por baixo), e cada app do
//    celular leva a uma tela que existe;
// 2. a entrada no estilo do jogo; a conversa (mandar uma mensagem na janela do app); a exportação da conversa do jogador;
//    conectar o WhatsApp com o QR Code dentro do jogo;
// 3. o jogador comum (?papel=jogador) não vê o app de administrador, e a URL direta do painel volta ao jogo (o servidor
//    também recusa: o 01, sql/057);
// 4. tocar na Pepper abre a ficha dela, com a ficha completa e o celular dela; a ficha da Morgan só tem coisa de criança;
// 5. a abertura aparece e sai sozinha (e um toque pula), o ícone e o manifest, a versão do app igual à do versao.json;
// 6. o WebGL perdido: o jogo pausa e volta, com a cena refeita.
// Como rodar: node scripts/testar_app_jogo.mjs   (a Action "Verificar design" roda em todo PR)
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { servir } from './servidor.mjs';

const raiz = resolve(dirname(new URL(import.meta.url).pathname), '..');
const ler = (p) => readFileSync(join(raiz, p), 'utf8');
const erros = []; const erro = (m) => erros.push(m);
const { chromium } = createRequire(import.meta.url)('playwright');
const servidor = await servir(raiz); const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
const p = await ctx.newPage(); const falhasJs = []; p.on('pageerror', (e) => falhasJs.push(e.message));
const pronta = async () => { await p.waitForFunction(() => document.documentElement.dataset.fase && document.documentElement.dataset.fase !== 'carregando', null, { timeout: 8000 }); await p.waitForTimeout(150); };
const abrir = async (rota, extra = '') => { await p.goto('about:blank'); await p.goto(`${servidor.url}/index.html?demo=1${extra}#${rota}`); await pronta(); };
const jogoPronto = () => p.waitForFunction(() => window.jogoTeste && window.jogoTeste.motor && window.jogoTeste.celular, null, { timeout: 10000 });

// 1. A auditoria: cada tela antiga mora no jogo.
const TELAS = ['CV', 'CV1', 'CV2', 'CV3', 'K1', 'VI0', 'VI1/casa', 'VI2/t-filtro', 'VI3', 'VI4', 'VI5/gatos/mingau', 'VI6', 'AG0', 'AG1/c1', 'AG2', 'AG3/carla', 'AG4',
  'FI0', 'FI1', 'FI2/g1', 'FI3', 'FI4/a2', 'FI5', 'FI6', 'FI7', 'FI8', 'FI9', 'PE1', 'PE4', 'PE5', 'AJ0', 'AJ1', 'AJ2', 'AJ3', 'WA', 'PJ0', 'PJ1', 'PJ2', 'PJ3', 'PJ4', 'PJ5', 'PJ6', 'PJ7', 'PJ9', 'PJ10', 'PJ12', 'PJ13', 'PJ14'];
for (const rota of TELAS) {
  falhasJs.length = 0; await abrir(rota);
  const r = await p.evaluate(() => ({ tela: document.documentElement.dataset.tela, fase: document.documentElement.dataset.fase, casca: !!document.querySelector('.jogo[data-casca]'),
    app: !!document.querySelector('.jogo__app:not([hidden]) .tela'), secoes: !!document.querySelector('.secoes') }));
  if (r.tela !== rota.split('/')[0] || r.fase !== 'pronto' || !r.casca || !r.app || r.secoes) erro(`auditoria: #${rota} não abriu como app dentro do jogo (${JSON.stringify(r)})`);
  for (const m of falhasJs) erro(`auditoria: #${rota}: erro de JavaScript: ${m}`);
}
// Os apps do celular levam a telas que existem, e a volta de um app de primeiro nível é o celular.
await abrir('JG/celular'); await jogoPronto();
const apps = await p.$$eval('[data-folha] a.jogo__appi, [data-folha] a.jogo__linha', (l) => l.map((a) => a.getAttribute('href')));
for (const h of ['#CV', '#K1', '#PE1', '#VI0', '#AG0', '#FI0', '#FI9', '#VI1/gatos', '#VI6', '#WA', '#PJ0']) if (!apps.includes(h)) erro(`celular: falta o app ${h} na tela de início`);
await p.click('[data-folha] a.jogo__appi[href="#AG0"]'); await pronta();
if (await p.getAttribute('html', 'data-tela') !== 'AG0' || await p.$eval('[data-folha]', (f) => !f.hidden)) erro('celular: o app Agenda não abriu na janela (ou o celular ficou aberto por cima)');
await p.click('.jogo__app .topo__esq a'); await pronta();
if (await p.getAttribute('html', 'data-tela') !== 'JG' || !(await p.$eval('[data-folha]', (f) => !f.hidden)) || !(await p.$('.jogo__app[hidden]'))) erro('celular: a volta do app não levou à tela de início do celular');

// 2. A entrada no estilo do jogo.
await abrir('entrar');
if (!(await p.$('.tela--jogo .janela-jogo form')) || await p.$('.jogo[data-casca]')) erro('entrada: o login não está na janela do jogo (ou o jogo ficou por trás)');
// A conversa na janela do app.
await abrir('CV');
await p.fill('#msg', 'teste da janela do app'); await p.click('.jogo__app button:has-text("Enviar")'); await p.waitForTimeout(600);
if (!(await p.$('.jogo__app .msg--ele:has-text("teste da janela do app")'))) erro('conversa: a mensagem não aparece na janela do app');
// A exportação da conversa do jogador (Configurações › Exportar a conversa › 7 dias).
await abrir('JG/config'); await jogoPronto();
await p.click('[data-folha] [data-a="exportar"]'); await p.click('[data-folha] [data-a="exp:7"]');
const baixar = await p.waitForSelector('[data-folha] a[download]', { timeout: 5000 }).catch(() => null);
if (!baixar || !/^conversa-\d{4}-\d{2}-\d{2}-a-\d{4}-\d{2}-\d{2}\.md$/.test(await baixar.getAttribute('download'))) erro('exportar: o arquivo da conversa não ficou pronto');
// O "reportar" do jogo.
await p.click('[data-folha] [data-a="voltar"]'); await p.click('[data-folha] [data-a="reportar"]'); await p.fill('[data-relato]', 'a TV sumiu'); await p.click('[data-folha] [data-a="mandar-relato"]');
await p.waitForTimeout(300); if (!(await p.$('.jogo__aviso:has-text("caso 7"), .jogo__avisos :text("caso 7")'))) erro('reportar: o caso não voltou com o número');
// O WhatsApp com o QR dentro do jogo.
await abrir('WA'); await p.click('.jogo__app [data-wa-conectar]');
if (!(await p.waitForSelector('.jogo__app img.qr', { timeout: 5000 }).catch(() => null))) erro('WhatsApp: o QR Code não aparece dentro do jogo');

// 3. O jogador comum.
await abrir('JG/celular', '&papel=jogador'); await jogoPronto();
if (await p.$('[data-folha] a[href="#PJ0"]') || await p.$('[data-folha] a[href="#WA"]')) erro('jogador comum: vê o app de administrador');
await abrir('PJ0', '&papel=jogador');
if (await p.getAttribute('html', 'data-tela') !== 'JG' || await p.$('.jogo__app:not([hidden])')) erro('jogador comum: a URL direta do painel abriu');
const recusa = await p.evaluate(async () => { const { chamar } = await import('./app/api.js'); try { await chamar('painel/hoje', { acao: 'ler' }); return 'abriu'; } catch (e) { return e.message; } });
if (!/Só o administrador/.test(recusa)) erro('jogador comum: o pedido do painel não foi recusado');

// 4. A ficha: tocar na Pepper.
await abrir('JG'); await jogoPronto();
// Independente da hora: a Pepper fica à vista no lugar dela (como quando está acordada na sala) e o toque vai no mesmo
// instante, antes do próximo quadro.
await p.evaluate(() => { const c = window.jogoTeste.motor.jogo.scene.scenes[0]; const s = c.spPepper; c.camera = 'pepper';
  s.setTexture('pepper-frente-parada').setVisible(true); const b = s.getBounds(); const pt = c.naTela(b.centerX, b.centerY); c.tocou(pt); });
const cartao = await p.waitForSelector('[data-folha]:not([hidden]) .jogo__titulo:has-text("Pepper")', { timeout: 5000 }).catch(() => null);
if (!cartao || !(await p.$('[data-folha] :text("Agora: lendo no sofá")'))) erro('ficha: tocar na Pepper não abriu o cartão dela');
else {
  await p.click('[data-folha] [data-f="completa"]'); if (!(await p.$('[data-folha] :text("Personalidade")'))) erro('ficha: a ficha completa da Pepper');
  await p.click('[data-folha] [data-f="cartao"]'); await p.click('[data-folha] [data-f="celular"]');
  await p.waitForSelector('[data-folha] :text("Despertador: 07:00")', { timeout: 5000 }).catch(() => erro('ficha: o celular dela não abriu'));
  await p.click('[data-folha] [data-f="conversa:Morgan"]').catch(() => erro('celular dela: a conversa com a Morgan'));
  if (!(await p.$('[data-folha] :text("escovou os dentes")'))) erro('celular dela: a conversa com a Morgan não mostra as mensagens');
}
const morgan = await p.evaluate(async () => { window.jogoTeste.ficha.abrir('morgan'); await new Promise((r) => setTimeout(r, 400)); return document.querySelector('[data-folha]').textContent; });
if (!/filha da Pepper/.test(morgan) || /Bens|Humor/.test(morgan)) erro('ficha: o cartão da Morgan não é só de criança');

// 5. A abertura, o ícone, o manifest e a versão.
await p.goto('about:blank'); await p.goto(`${servidor.url}/index.html?demo=1#JG`);
if (!(await p.$('[data-abertura]'))) erro('abertura: não apareceu ao abrir');
await p.waitForFunction(() => !document.querySelector('[data-abertura]'), null, { timeout: 4000 }).catch(() => erro('abertura: não saiu sozinha em até 3 segundos'));
await p.goto('about:blank'); await p.goto(`${servidor.url}/index.html?demo=1&estado=carregando#JG`);
await p.click('[data-abertura]').catch(() => {}); if (await p.$('[data-abertura]')) erro('abertura: um toque não pulou');
const man = JSON.parse(ler('manifest.webmanifest'));
if (man.display !== 'fullscreen' || man.orientation !== 'any' || man.theme_color !== '#1B1430' || !man.icons.some((i) => /maskable/.test(i.purpose))) erro('manifest: tela cheia, orientação livre, cor do jogo e o ícone com fundo adaptável');
for (const i of man.icons) if (!existsSync(join(raiz, i.src))) erro('manifest: falta o ícone ' + i.src);
for (const o of ['janela', 'casinha', 'abajur']) if (!existsSync(join(raiz, `app/icones/opcoes/${o}-512.png`))) erro('ícones: falta a opção ' + o);
const versao = Number((ler('app/versao.js').match(/VERSAO = (\d+)/) || [])[1]);
if (!versao || JSON.parse(ler('versao.json')).versao !== versao) erro('versão: app/versao.js e versao.json diferentes');
if (/skipWaiting\(\)\)/.test(ler('sw.js').split('install')[1].split('activate')[0])) erro('service worker: o skipWaiting às cegas na instalação');

// 6. O WebGL perdido: pausa e volta, com a cena refeita.
await abrir('JG'); await jogoPronto();
const volta = await p.evaluate(async () => {
  const antes = window.jogoTeste.motor; const tela = document.querySelector('[data-mundo] canvas'); const gl = tela.getContext('webgl2') || tela.getContext('webgl');
  const ext = gl && gl.getExtension('WEBGL_lose_context'); if (!ext) return 'sem extensão';
  ext.loseContext(); await new Promise((r) => setTimeout(r, 300)); ext.restoreContext();
  for (let i = 0; i < 40; i++) { await new Promise((r) => setTimeout(r, 150)); if (window.jogoTeste.motor && window.jogoTeste.motor !== antes) return 'refez'; }
  return 'não refez';
});
if (volta !== 'refez' && volta !== 'sem extensão') erro('WebGL: a cena não foi refeita depois de perder o contexto');

await nav.close(); servidor.fechar();
if (erros.length) { console.error(`App no jogo: ${erros.length} problema(s)\n` + erros.map((e) => '- ' + e).join('\n')); process.exit(1); }
console.log(`App no jogo: tudo certo (${TELAS.length} telas antigas dentro do jogo, o celular, a entrada, a conversa, a exportação, o QR, o jogador comum, a ficha, a abertura, o ícone e o WebGL).`);
