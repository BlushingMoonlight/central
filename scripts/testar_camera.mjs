// O teste da câmera sem pinça (rodada 9, adendo 3): o zoom pelos botões (+ e −, em níveis inteiros, com teto), pela roda do
// mouse e pelo toque duplo; "centralizar"; "ver tudo"; e, no construtor, um dedo arrastando move a câmera. Os botões
// de zoom só aparecem pela opção de acessibilidade (DEC-198), e o chip da hora é só informação.
// Como rodar: node scripts/testar_camera.mjs   (abre o jogo no modo de demonstração; sai com erro se algo não bater)
import { createRequire } from 'node:module'; const { chromium } = createRequire(import.meta.url)('playwright');
import { servir } from './servidor.mjs'; import { fileURLToPath } from 'node:url';
const s = await servir(fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '')); const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
const erros = []; pg.on('pageerror', (e) => erros.push(e.message));
await pg.goto(s.url + '/?demo=1#JG'); await pg.waitForTimeout(4000);
const escala = () => pg.evaluate(() => { const g = window.jogoTeste.motor.jogo; return g ? g.scene.scenes[0].escala : null; });
const r = { inicio: await escala() };
// De fábrica, sem os botões de zoom na tela; o chip não abre nada (DEC-198).
r.semBotoes = await pg.evaluate(() => document.querySelector('[data-zoomcaixa]').hidden);
await pg.click('[data-chip]', { force: true }); await pg.waitForTimeout(200);
r.chip = await pg.evaluate(() => document.querySelector('[data-chip]').tagName !== 'BUTTON' && document.querySelector('[data-folha]').hidden);
// Configurações › Acessibilidade: liga os botões.
await pg.click('[data-celular]'); await pg.click('[data-aba="config"]'); await pg.click('[data-zoombotoes]'); await pg.waitForTimeout(300); await pg.click('[data-a="fechar"]');
r.comBotoes = await pg.evaluate(() => !document.querySelector('[data-zoomcaixa]').hidden);
await pg.click('[data-zoom="1"]'); r.mais = await escala();
await pg.click('[data-zoom="1"]'); await pg.click('[data-zoom="1"]'); await pg.click('[data-zoom="1"]'); r.teto = await escala();
await pg.click('[data-zoom="-1"]'); r.menos = await escala();
await pg.click('[data-centro]');
await pg.evaluate(() => { const c = window.jogoTeste.motor.jogo.scene.scenes[0]; c.escalaManual = null; c.ajustarEscala(); });
await pg.mouse.move(200, 400); await pg.mouse.wheel(0, -200); await pg.waitForTimeout(300); r.roda = await escala();
await pg.evaluate(() => { const c = window.jogoTeste.motor.jogo.scene.scenes[0]; c.escalaManual = null; c.ajustarEscala(); });
await pg.mouse.click(60, 700); await pg.waitForTimeout(100); await pg.mouse.click(60, 700); await pg.waitForTimeout(200); r.duplo = await escala();
await pg.evaluate(() => { const c = window.jogoTeste.motor.jogo.scene.scenes[0]; c.verTudo(); }); r.verTudo = await escala();
// câmera solta (construtor): um dedo arrastando move
await pg.evaluate(() => { const c = window.jogoTeste.motor.jogo.scene.scenes[0]; c.construindo = 'mao'; c.livre = null; });
const antes = await pg.evaluate(() => window.jogoTeste.motor.jogo.scene.scenes[0].cameras.main.midPoint.x);
await pg.mouse.move(200, 600); await pg.mouse.down(); await pg.mouse.move(120, 600, { steps: 8 }); await pg.mouse.up(); await pg.waitForTimeout(1500);
r.arrastou = Math.round(await pg.evaluate(() => window.jogoTeste.motor.jogo.scene.scenes[0].cameras.main.midPoint.x) - antes);
await b.close(); s.fechar();
const falhas = [];
if (!r.semBotoes || !r.chip || !r.comBotoes) falhas.push('os botões de zoom aparecem de fábrica, o chip abre o celular, ou a opção de acessibilidade não liga os botões');
if (!(r.mais === r.inicio + 1)) falhas.push('o + não aproximou um nível');
if (!(r.teto === r.inicio + 2)) falhas.push('o zoom passou do teto (dois níveis acima do automático)');
if (!(r.menos === r.teto - 1)) falhas.push('o − não afastou');
if (!(r.roda === r.inicio + 1)) falhas.push('a roda do mouse não aproximou');
if (!(r.duplo === r.inicio + 1)) falhas.push('o toque duplo não aproximou');
if (!(r.verTudo >= 1 && r.verTudo <= r.inicio)) falhas.push('"ver tudo" não afastou para caber a casa');
if (!(r.arrastou > 40)) falhas.push('no construtor, um dedo arrastando não moveu a câmera');
if (erros.length) falhas.push('erro de JavaScript: ' + erros.join('; '));
console.log(falhas.length ? 'Câmera: ' + falhas.join('; ') : 'Câmera: tudo certo ' + JSON.stringify({ ...r, semBotoes: undefined, chip: undefined, comBotoes: undefined }));
process.exit(falhas.length ? 1 : 0);
