// O teste da parte J no navegador (rodada 9; DEC-204 a DEC-209), no modo de demonstração: o menu em círculo (a ação
// principal no centro, até 6), o toque longo (o que é e de onde veio), a vibração, o boneco do Jean sentando no sofá, o
// construtor (arrastar, girar, desfazer, puxar a parede, o apartamento alugado sem as ferramentas de parede), a criação de
// personagem (a parte tocada, a idade que esconde a roupa sensual, salvar), a música (liga e o mudo desliga), a página da
// comparação de resolução (os pixels inteiros) e o desempenho com tudo se mexendo, que para em segundo plano. A máquina do
// teste desenha sem placa de vídeo (o FPS dela varia de 30 a 42 com ou sem a parte J): o teste mede o custo da animação
// por quadro (menos de 1 ms) e um piso de 25 FPS; os 50 do Android se conferem no aparelho (Celular › Configurações ›
// Diagnóstico › Medir por 10 segundos).
// Como rodar: node scripts/testar_toque.mjs   (roda em todo PR)
import { createRequire } from 'node:module'; const { chromium } = createRequire(import.meta.url)('playwright');
import { servir } from './servidor.mjs'; import { fileURLToPath } from 'node:url';
const s = await servir(fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '')); const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 820, height: 900 }, hasTouch: true });
await pg.addInitScript(() => { window.__vibrou = 0; Object.defineProperty(navigator, 'vibrate', { value: () => { window.__vibrou++; return true; }, configurable: true }); });
const erros = []; pg.on('pageerror', (e) => erros.push(e.message + ' @ ' + String(e.stack || '').split('\n').slice(1, 3).join(' ')));
const falhas = []; const f = (c, t) => { if (!c) falhas.push(t); };
const cena = () => 'window.jogoTeste.motor.jogo.scene.scenes[0]';
await pg.goto(s.url + '/?demo=1&hora=21#JG'); await pg.waitForTimeout(4500);
await pg.evaluate(() => window.jogoTeste.motor.camera('livre'));

// 1. O menu em círculo na TV (o Jean está na casa dele: só o controle à distância, sem "assistir").
const ondeTv = await pg.evaluate(() => window.jogoTeste.motor.posicao('tv'));
await pg.evaluate(({ x, y }) => window.jogoTeste.menus.abrir('tv', x, y), ondeTv); await pg.waitForTimeout(200);
const roda = await pg.evaluate(() => { const r = document.querySelector('.jogo__roda'); return { aberta: !r.hidden, n: r.querySelectorAll('button').length, centro: (r.querySelector('.jogo__roda-b--centro') || {}).textContent, todos: [...r.querySelectorAll('button')].map((x) => x.textContent) }; });
f(roda.aberta && roda.n >= 2 && roda.n <= 6 && /Ligar|Desligar/.test(roda.centro) && !roda.todos.includes('Assistir'), `toque: o menu em círculo da TV (${JSON.stringify(roda)})`);
f(await pg.evaluate(() => window.__vibrou) >= 1, 'toque: abrir o menu não vibrou');
await pg.click('.jogo__roda-b--centro'); await pg.waitForFunction(() => /estranhou/.test(document.querySelector('.jogo__avisos').textContent), null, { timeout: 4000 }).catch(() => {});
f(await pg.evaluate(() => /estranhou/.test(document.querySelector('.jogo__avisos').textContent)), 'toque: a ação do centro (ligar a TV) não chegou (a demonstração responde "ela estranhou")');
f(await pg.evaluate(() => document.querySelector('.jogo__roda').hidden), 'toque: o menu em círculo não fechou depois da ação');
// 2. O toque longo: a informação, sem mexer em nada.
await pg.evaluate(({ x, y }) => window.jogoTeste.menus.info('sofa', x, y), ondeTv); await pg.waitForTimeout(150);
const info = await pg.evaluate(() => { const i = document.querySelector('.jogo__info'); return !i.hidden && /De onde veio/.test(i.textContent) && /tecido/.test(i.textContent); });
f(info, 'toque longo: a ficha do item não abriu com o que é e de onde veio'); await pg.click('.jogo__info [data-fechar]');
// o toque longo de verdade: segurar o dedo em cima do item (480 ms) abre a mesma ficha
await pg.evaluate(() => { const c = window.jogoTeste.motor.jogo.scene.scenes[0]; const p = c.sprites.pufe; c.livre = { x: p.x, y: p.y }; }); await pg.waitForTimeout(4800); // longe dos avisos do alto
const pufe = await pg.evaluate(() => window.jogoTeste.motor.posicao('pufe'));
await pg.mouse.move(pufe.x, pufe.y + 6); await pg.mouse.down(); await pg.waitForTimeout(650); await pg.mouse.up(); await pg.waitForTimeout(150);
f(await pg.evaluate(() => !document.querySelector('.jogo__info').hidden || !document.querySelector('.jogo__roda').hidden), 'toque longo: segurar o dedo no pufe não mostrou nada');
await pg.evaluate(() => window.jogoTeste.menus.fechar());

// 3. O boneco do Jean senta no sofá da casa dele (anda até lá e faz a ação).
await pg.evaluate(() => window.jogoTeste.verMapa('casa-jean')); await pg.waitForTimeout(1500);
const s2 = await pg.evaluate(() => window.jogoTeste.motor.posicao('sofa'));
await pg.evaluate(({ x, y }) => window.jogoTeste.menus.abrir('sofa', x, y), s2); await pg.waitForTimeout(150);
const centro = await pg.evaluate(() => (document.querySelector('.jogo__roda-b--centro') || {}).textContent);
f(centro === 'Sentar', `usar: o centro do menu do sofá, com o Jean em casa, não é "Sentar" (${centro})`);
await pg.click('.jogo__roda-b--centro'); await pg.waitForTimeout(3500);
const pose = await pg.evaluate((c) => { const j = eval(c).jean; return j.acao && j.acao.pose; }, cena());
f(pose === 'sentada', `usar: o Jean não sentou no sofá (${pose})`);

// 4. O construtor na casa dele: arrastar, girar, desfazer, puxar a parede.
await pg.evaluate(() => window.jogoTeste.construtor.abrir()); await pg.waitForTimeout(400);
const ev = (t, x, y) => pg.evaluate(([t, x, y]) => window.jogoTeste.construtor.evento(t, x, y), [t, x, y]);
await pg.click('[data-c="f:mao"]');
f(await ev('inicio', 4.9, 1.5) === 'captura', 'construtor: o dedo no abajur não pegou o item');
await ev('arrasto', 4.9, 3.5); await ev('fim', 4.9, 3.5);
const ab = await pg.evaluate(() => window.jogoTeste.construtor.estado().mapa.itens.find((i) => i.id === 'abajur-chao'));
f(Math.abs(ab.y - 3.2) < 0.3, `construtor: arrastar não moveu o abajur (y=${ab.y})`);
await ev('inicio', 2.5, 2.5); await ev('fim', 2.5, 2.5); await pg.waitForTimeout(100); // seleciona o sofá
await pg.click('[data-c="girar"]'); await pg.waitForTimeout(200);
const gir = await pg.evaluate(() => window.jogoTeste.construtor.estado().mapa.itens.find((i) => i.id === 'sofa'));
f(gir && gir.w === 1 && gir.d === 3 && gir.espelhado, `construtor: girar o sofá (${JSON.stringify(gir && [gir.w, gir.d, gir.espelhado])})`);
await pg.click('[data-c="desfazer"]'); await pg.waitForTimeout(150);
f(await pg.evaluate(() => window.jogoTeste.construtor.estado().mapa.itens.find((i) => i.id === 'sofa').w === 3), 'construtor: desfazer não desfez o giro');
await pg.click('[data-c="f:comodo"]');
f(await ev('inicio', 6, 2.5) === 'captura', 'construtor: a borda do cômodo não pegou');
await ev('arrasto', 7, 2.5); await ev('fim', 7, 2.5); await pg.waitForTimeout(150);
const sala = await pg.evaluate(() => window.jogoTeste.construtor.estado().mapa.comodos[0].area);
f(sala[2] === 7, `construtor: puxar a parede não aumentou o cômodo (${sala})`);
f(await pg.evaluate(() => [...document.querySelectorAll('.jogo__construtor [data-c^="f:"]')].length) === 15, 'construtor: na casa dele faltam ferramentas');
await pg.evaluate(() => window.jogoTeste.construtor.fechar());
// no apartamento dela (alugado), só os móveis mudam
await pg.evaluate(() => window.jogoTeste.verMapa('casa-pepper')); await pg.waitForTimeout(1200);
await pg.evaluate(() => window.jogoTeste.construtor.abrir()); await pg.waitForTimeout(300);
const fer = await pg.evaluate(() => [...document.querySelectorAll('.jogo__construtor [data-c^="f:"]')].map((x) => x.dataset.c));
f(!fer.includes('f:parede') && !fer.includes('f:comodo') && fer.includes('f:mao') && /alugado/.test(await pg.textContent('.jogo__construtor')), `apartamento: as ferramentas de parede apareceram (${fer})`);
await pg.click('[data-c="f:item"]'); await pg.fill('[data-busca]', 'vela'); await pg.waitForTimeout(150);
f(await pg.evaluate(() => [...document.querySelectorAll('[data-c^="modelo:"]')].map((x) => x.dataset.c).join()) === 'modelo:vela', 'catálogo: a busca não achou só a vela');
await pg.evaluate(() => window.jogoTeste.construtor.fechar());

// 5. A criação de personagem.
await pg.click('[data-celular]'); await pg.click('[data-aba="config"]'); await pg.waitForTimeout(300); await pg.click('[data-a="aparencia"]'); await pg.waitForTimeout(200);
f(await pg.evaluate(() => !!document.querySelector('[data-boneco]')), 'criador: não abriu');
const px = async () => pg.evaluate(() => document.querySelector('[data-boneco]').toDataURL());
const antes = await px(); await pg.click('[data-c="parte:cabelo"]'); await pg.click('[data-c="cabelo:cacheado"]'); f(antes !== await px(), 'criador: trocar o cabelo não mudou o boneco');
const box = await pg.evaluate(() => { const r = document.querySelector('[data-boneco]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height * 0.6 }; });
await pg.mouse.click(box.x, box.y); f(await pg.evaluate(() => !!document.querySelector('[data-peca="cima"]')), 'criador: tocar no corpo não abriu a roupa');
await pg.click('[data-c="parte:corpo"]'); await pg.click('[data-c="idade:crianca"]'); await pg.click('[data-c="parte:roupa"]');
f(await pg.evaluate(() => !document.querySelector('[data-c="peca:cima:biquini_top"]') && !document.querySelector('[data-c="peca:baixo:biquini"]')), 'criador: a criança tem roupa sensual para escolher');
await pg.click('[data-c="parte:corpo"]'); await pg.click('[data-c="idade:adulto"]'); await pg.click('[data-c="salvar"]'); await pg.waitForTimeout(400);
f(await pg.evaluate(() => { const a = window.jogoTeste.motor.estado().jean.aparencia; return a.cabelo === 'cacheado' && !!a.criado_em; }), 'criador: salvar não guardou a aparência');
await pg.click('[data-c="voltar"]'); await pg.waitForTimeout(200); await pg.click('[data-aba="casa"]'); await pg.click('[data-a="guarda-roupa"]'); await pg.waitForTimeout(150);
const gr = await pg.evaluate(() => [document.querySelectorAll('[data-oc]').length, !!document.querySelector('[data-folha] [data-c="salvar"]'), document.querySelector('[data-folha]').textContent.slice(0, 60)]);
f(gr[0] === 5 && !gr[1], 'criador: o guarda-roupa dela não mostra as 5 ocasiões só para ver ' + JSON.stringify(gr));
await pg.click('[data-c="voltar"]'); await pg.click('[data-a="fechar"]');

// 6. A música: liga com o primeiro toque e o mudo desliga.
await pg.mouse.click(400, 450); await pg.waitForTimeout(600);
const mus = await pg.evaluate(async () => { const J = window.jogoTeste; J.tocarMusica(); await new Promise((r) => setTimeout(r, 300)); const a = J.musica.estado(); J.som.mudo(true); J.tocarMusica(); await new Promise((r) => setTimeout(r, 200)); const d = J.musica.estado(); J.som.mudo(false); return { a, d }; });
f(mus.a.ligada && !!mus.a.faixa && mus.a.ganhos.percussao === 0 && !mus.d.ligada, `música: ${JSON.stringify(mus)}`);

// 7. O FPS com tudo se mexendo (a chuva, a TV, o aquário, a lava, a vela, a vista) e a pausa em segundo plano.
await pg.evaluate(() => { const c = window.jogoTeste.motor.jogo.scene.scenes[0]; c.camera = 'livre'; c.livre = null; c.verTudo(); }); await pg.waitForTimeout(800);
const fps = await pg.evaluate(async () => { const g = window.jogoTeste.motor.jogo; const a = []; for (let k = 0; k < 15; k++) { await new Promise((r) => setTimeout(r, 200)); a.push(g.loop.actualFps); } return a.reduce((x, y) => x + y, 0) / a.length; });
// o custo da vida (o que a parte J soma a cada quadro): em média, menos de 1 ms (6% de um quadro de 60 FPS)
const custo = await pg.evaluate(async () => { const c = window.jogoTeste.motor.jogo.scene.scenes[0]; const orig = c.vivo.atualizar; let soma = 0, n = 0;
  c.vivo.atualizar = (t) => { const a = performance.now(); orig(t); soma += performance.now() - a; n++; }; await new Promise((r) => setTimeout(r, 3000)); c.vivo.atualizar = orig; return soma / Math.max(1, n); });
f(fps >= 25 && custo < 1, `FPS: ${Math.round(fps)} com tudo se mexendo e ${custo.toFixed(2)} ms por quadro de animação (mínimos: 25 FPS nesta máquina sem placa de vídeo, e menos de 1 ms)`);
const pausa = await pg.evaluate(async () => { const c = window.jogoTeste.motor.jogo.scene.scenes[0]; const q0 = c.vivo.contagem.quadros; await new Promise((r) => setTimeout(r, 600)); const q1 = c.vivo.contagem.quadros;
  Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); await new Promise((r) => setTimeout(r, 100)); const q2 = c.vivo.contagem.quadros;
  await new Promise((r) => setTimeout(r, 800)); const q3 = c.vivo.contagem.quadros; Object.defineProperty(document, 'hidden', { value: false, configurable: true }); return { anda: q1 > q0, parou: q3 === q2 }; });
f(pausa.anda && pausa.parou, `vida: a vista não anda, ou não para em segundo plano (${JSON.stringify(pausa)})`);

// 8. A comparação de resolução: as duas versões desenhadas, do mesmo tamanho, com pixels inteiros.
await pg.goto(s.url + '/prototipo/resolucao/index.html'); await pg.waitForTimeout(800);
const cmp = await pg.evaluate(() => [...document.querySelectorAll('.comparacao__tela')].map((c) => ({ w: c.width, css: c.getBoundingClientRect().width })));
f(cmp.length === 2 && cmp.every((c) => c.w > 0 && Number.isInteger(c.css / c.w)) && Math.abs(cmp[0].css - cmp[1].css) < 1 && cmp[1].w === cmp[0].w * 2, `comparação: ${JSON.stringify(cmp)}`);

f(!erros.length, 'erro de JavaScript: ' + erros.slice(0, 3).join(' | '));
await b.close(); s.fechar();
if (falhas.length) { console.error('Toque e construção: ' + falhas.length + ' falha(s)\n- ' + falhas.join('\n- ')); process.exit(1); }
console.log(`Toque e construção: tudo certo (o menu em círculo, o toque longo, sentar no sofá, o construtor, o apartamento, o criador, a música, ${Math.round(fps)} FPS, ${custo.toFixed(2)} ms de animação e a comparação).`);
