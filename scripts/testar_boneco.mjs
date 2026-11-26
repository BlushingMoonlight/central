// O teste da parte J sem navegador (rodada 9; DEC-204 a DEC-209): o boneco em camadas (as camadas em sincronia, a troca de
// paleta, as idades e os corpos), a genética (o parente parecido), o bloqueio por idade, o aleatório e os modelos, o
// questionário, a roupa do dia, as regras do construtor (encaixe, em cima da bancada, a porta, a passagem), a vista da
// janela (a noite, a chuva, a escada de incêndio), a música em camadas (a chuva tira a percussão) e o som sem repetir.
// Como rodar: node scripts/testar_boneco.mjs   (roda em todo PR)
import { readFileSync } from 'node:fs';
const B = await import('../jogo/boneco.js'); const { regras, fechaPassagem } = await import('../jogo/construtor.js');
const V = await import('../jogo/vivo.js'); const M = await import('../jogo/musica.js'); const S = await import('../jogo/som.js'); const C = await import('../jogo/catalogo.js');
const falhas = []; const f = (cond, t) => { if (!cond) falhas.push(t); };
const mascara = (p) => p.px.map((c) => (c ? 1 : 0)).join('');
const caixaDe = (p) => { let x0 = 99, y0 = 99, x1 = -1, y1 = -1; p.px.forEach((c, i) => { if (!c) return; const x = i % p.w, y = Math.floor(i / p.w); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }); return [x0, y0, x1, y1]; };

// 1. As camadas em sincronia: em todo quadro, cada camada fica dentro do corpo (com a folga do cabelo e do contorno), e
//    todas as pessoas têm os mesmos quadros.
const ap = B.aleatoria(5, 'adulto');
for (const pose of ['parada', 'sentada', 'usando', 'andando']) for (const q of [0, 1, 2, 3]) for (const lado of ['frente', 'costas']) {
  const corpo = caixaDe(B.desenhar(ap, lado, q, pose, { so: ['corpo'] }));
  for (const k of ['baixo', 'sapatos', 'cima']) { const c = caixaDe(B.desenhar(ap, lado, q, pose, { so: [k] })); if (c[2] < 0) continue;
    f(c[0] >= corpo[0] - 2 && c[2] <= corpo[2] + 2 && c[1] >= corpo[1] - 1 && c[3] <= corpo[3] + (k === 'sapatos' ? 3 : 1), `camadas: ${k} sai do corpo em ${lado}/${pose}/${q}`); }
  if (pose !== 'andando' && q) break; }
const chaves = (o) => Object.keys(o).map((k) => k.replace(/^[a-z0-9]+-/, '')).sort().join();
f(chaves(B.quadros('jean', ap)) === chaves(B.quadros('x', B.aleatoria(9, 'crianca'))) && chaves(B.pepper({})) === chaves(B.quadros('y', ap)), 'camadas: as pessoas não têm os mesmos quadros');
// 2. A troca de paleta: mudar a cor do cabelo muda só as cores, nunca o desenho.
const outro = { ...ap, cor_cabelo: '#3b4f8f' };
f(mascara(B.desenhar(ap, 'frente', 0, 'parada')) === mascara(B.desenhar(outro, 'frente', 0, 'parada')), 'paleta: trocar a cor do cabelo mudou o desenho');
f(B.desenhar(ap, 'frente', 0, 'parada').px.join() !== B.desenhar(outro, 'frente', 0, 'parada').px.join(), 'paleta: trocar a cor do cabelo não mudou nada');
// 3. As idades, as alturas e os corpos mudam o tamanho.
const alt = (a) => { const c = caixaDe(B.desenhar(a, 'frente', 0, 'parada')); return c[3] - c[1]; }; const larg = (a) => { const c = caixaDe(B.desenhar(a, 'frente', 0, 'parada')); return c[2] - c[0]; };
f(alt({ ...ap, idade: 'crianca' }) < alt({ ...ap, idade: 'adolescente' }) && alt({ ...ap, idade: 'adolescente' }) < alt(ap), 'corpo: a criança não é menor que o adolescente, ou o adolescente que o adulto');
f(alt({ ...ap, altura: 'baixa' }) < alt({ ...ap, altura: 'alta' }), 'corpo: a altura não muda nada');
f(larg({ ...ap, corpo: 'magro', acessorios: [], cabelo: 'curto' }) < larg({ ...ap, corpo: 'forte', acessorios: [], cabelo: 'curto' }), 'corpo: o forte não é mais largo que o magro');
// 4. A genética: o filho parece mais com os pais do que com um estranho (a pele e os olhos).
const dist = (a, b) => { const x = a.match(/\w\w/g).map((h) => parseInt(h, 16)), y = b.match(/\w\w/g).map((h) => parseInt(h, 16)); return Math.hypot(...x.map((v, i) => v - y[i])); };
let perto = 0; for (let s = 1; s <= 40; s++) { const p = B.aleatoria(s * 3), m = B.aleatoria(s * 7), fi = B.herdar(p, m, s), e = B.aleatoria(s * 11);
  const meio = '#' + [1, 3, 5].map((k) => Math.round((parseInt(p.pele.slice(k, k + 2), 16) + parseInt(m.pele.slice(k, k + 2), 16)) / 2).toString(16).padStart(2, '0')).join('');
  if (dist(fi.pele, meio) <= dist(fi.pele, e.pele) && [p.olhos, m.olhos].includes(fi.olhos)) perto++; f(!B.conferir(fi), `genética: o parente ${s} saiu inválido (${B.conferir(fi)})`); }
f(perto >= 30, `genética: só ${perto} de 40 parentes parecem com os pais`);
f(B.herdar(B.PEPPER, B.modeloPronto('Casual'), 3).idade === 'crianca' && B.herdar(B.PEPPER, B.modeloPronto('Casual'), 3).barba === 'nenhuma', 'genética: a criança gerada tem barba ou idade errada');
// 5. O bloqueio por idade (a mesma regra do servidor): menor de 18 anos sem roupa sensual nem barba.
const sensual = { casa: { cima: 'biquini_top', cor_cima: '#e0405a', baixo: 'biquini', cor_baixo: '#e0405a', sapato: 'chinelo', cor_sapato: '#000000' } };
for (const idade of ['crianca', 'adolescente']) { f(!!B.conferir({ ...ap, idade, roupas: sensual }), `idade: ${idade} com biquíni passou`); f(!!B.conferir({ ...ap, idade, barba: 'cheia' }), `idade: ${idade} com barba passou`); }
f(!B.conferir({ ...ap, idade: 'adulto', roupas: sensual }), 'idade: o adulto de biquíni foi recusado');
f(!!B.conferir({ ...ap, cabelo: 'moicano' }) && !!B.conferir({ ...ap, pele: 'vermelho' }) && !!B.conferir({ ...ap, tracos: ['curioso', 'calmo', 'nerd', 'timido'] }), 'conferir: aceitou cabelo, cor ou traços fora da lista');
for (let s = 1; s <= 200; s++) { const a = B.aleatoria(s); if (B.conferir(a)) { f(false, `aleatório ${s} inválido: ${B.conferir(a)}`); break; } if (B.MENOR.has(a.idade) && Object.values(a.roupas).some((r) => B.SENSUAL.has(r.cima) || B.SENSUAL.has(r.baixo))) f(false, 'aleatório: menor com roupa sensual'); }
for (const n of Object.keys(B.MODELOS_PRONTOS)) f(!B.conferir(B.modeloPronto(n)), `modelo pronto ${n} inválido`);
// a aparência antiga (DEC-176) vira a nova sem perder a cor da camisa
const velho = B.normalizar({ pele: 3, cabelo: 'curto', cor_cabelo: 'loiro', barba: 'curta', camisa: 'vinho', calca: 'preta', sapato: 'marrom' });
f(velho.pele === '#a9714d' && velho.cor_cabelo === B.CORES_CABELO.loiro && velho.roupas.casa.cor_cima === '#6e2a3a' && !B.conferir(velho), 'aparência antiga: não virou a nova');
// 6. O questionário e a roupa do dia.
f(B.sugerirTracos([1, 0, 2, 0, 1]).join() === 'aventureiro,carinhoso,curioso', 'questionário: a sugestão mudou (' + B.sugerirTracos([1, 0, 2, 0, 1]).join() + ')');
const r = (o) => B.roupaDoDia(ap, o);
f(r({ hora: 23.5 }).ocasiao === 'dormir' && r({ hora: 10, atividade: 'na academia' }).ocasiao === 'exercicio' && r({ hora: 10, fora: true }).ocasiao === 'sair' && r({ hora: 10 }).ocasiao === 'casa', 'roupa do dia: a ocasião');
f(r({ hora: 10, fora: true, temperatura: 3 }).roupa.cima === 'casaco' && r({ hora: 10, fora: true, temperatura: 3 }).acessorios.includes('cachecol'), 'roupa do dia: o frio não pôs casaco e cachecol');
f(r({ hora: 15, humor: 'triste' }).roupa.cima === 'moletom', 'roupa do dia: o dia ruim não pediu o moletom');
// a regra do app e a do servidor são a mesma (o servidor está no outro repositório: se ele estiver ao lado, confere)
try { const w = JSON.parse(readFileSync(new URL('../../central-sistema/n8n/68 - Mundo - Cena do jogo.json', import.meta.url), 'utf8')); const cod = w.nodes.find((n) => n.name === 'Simular a casa').parameters.jsCode;
  const fun = cod.match(/const FUNCOES = (\{[\s\S]*?\});\n/); f(fun && JSON.stringify(eval('(' + fun[1] + ')')) === JSON.stringify(C.FUNCOES), 'catálogo: as FUNCOES do app e do servidor (o 68) não são as mesmas');
  for (const k of ['crianca', 'biquini_top', 'cachecol', 'moletom']) f(cod.includes(`'${k}'`), `servidor: falta ${k} na regra de aparência ou de roupa`); } catch (e) { /* sem o outro repositório ao lado: só o app */ }

// 7. As regras do construtor (J2).
const mapa = JSON.parse(readFileSync(new URL('../jogo/mapas/casa-pepper.json', import.meta.url), 'utf8'));
const it = (id) => mapa.itens.find((i) => i.id === id);
f(!regras(mapa, it('pufe'), 4.5, 7.5).erro, 'construtor: o pufe não cabe num lugar livre');
f(/sofá/.test(regras(mapa, it('pufe'), 2.5, 4).erro || ''), 'construtor: o pufe passou em cima do sofá');
const caneca = it('caneca-sala'); const rb = regras(mapa, caneca, 10.5, 0.4); f(!rb.erro && rb.sobre && rb.sobre.modelo === 'bancada', 'construtor: a caneca não pousou em cima da bancada');
f(/porta/.test(regras(mapa, it('pufe'), 3, 8.8).erro || ''), 'construtor: o pufe tapou a porta');
f(/parede/.test(regras(mapa, it('pufe'), 7.6, 5).erro || ''), 'construtor: o pufe atravessou a parede');
f(fechaPassagem(mapa) === null, 'construtor: a casa dela de fábrica já tem passagem fechada (' + fechaPassagem(mapa) + ')');
const preso = JSON.parse(JSON.stringify(mapa)); preso.itens.push({ id: 'muro', modelo: 'estante', x: 3, y: 8.4, w: 1, d: 1.6 }, { id: 'muro2', modelo: 'estante', x: 2, y: 8.4, w: 1, d: 1.6 }, { id: 'muro3', modelo: 'estante', x: 4, y: 8.4, w: 1, d: 1.6 });
f(fechaPassagem(preso) !== null, 'construtor: fechar a porta com estantes não fechou a passagem');
f(mapa.alugado === true && mapa.vista === 'cidade' && mapa.exterior.tipo === 'predio', 'apartamento: o mapa dela não é o apartamento alugado com a vista da cidade');
f(C.materialDe('tv') === 'vidro' && C.materialDe('sofa') === 'tecido' && C.funcaoDe({ modelo: 'cama' }) === 'sentar', 'catálogo: o material ou a função');

// 8. A vista da janela: a noite tem estrelas e janelas acesas; a chuva escorre; a escada de incêndio aparece.
const vid = V.vidro('n'); f(vid.px.length > 100 && V.vidro('w').px.length === vid.px.length, 'vista: o vidro da janela não tem pixels');
const quadro = (e) => vid.px.map(([x, y, u, v]) => V.pintar('cidade', u, v, x, y, e)).join();
const noite = quadro({ h: 22, clima: 'sol', t: 0, semente: 7 }), dia = quadro({ h: 13, clima: 'sol', t: 0, semente: 7 });
f(noite !== dia && noite.includes('#ffd98a'), 'vista: a noite não acende as janelas da cidade');
f(quadro({ h: 22, clima: 'chuva', t: 0, semente: 7 }) !== quadro({ h: 22, clima: 'chuva', t: 500, semente: 7 }), 'vista: a chuva não escorre no vidro');
f(quadro({ h: 13, clima: 'sol', t: 0, semente: 7, escada: true }).includes('#2a2633'), 'vista: a escada de incêndio não aparece');
f(vid.px.map(([x, y, u, v]) => V.pintar('quintal', u, v, x, y, { h: 13, clima: 'sol', t: 0, semente: 3 })).some((c) => c === '#6fa36b' || c === '#9fcf86'), 'vista: o quintal do Jean não tem grama');
// 9. A música em camadas: a chuva tira a percussão, a hora escolhe a faixa, a casa dele tem a dela.
f(M.mistura({ hora: 9 }).faixa === 'manha' && M.mistura({ hora: 21 }).faixa === 'noite' && M.mistura({ hora: 3 }).faixa === 'madrugada' && M.mistura({ onde: 'casa-jean' }).faixa === 'casa_jean', 'música: a faixa pela hora');
f(M.mistura({ hora: 14, clima: 'chuva' }).ganhos.percussao === 0 && M.mistura({ hora: 14 }).ganhos.percussao > 0, 'música: a chuva não tirou a percussão');
f(M.mistura({ hora: 14, humor: 'triste' }).ganhos.melodia < M.mistura({ hora: 14, humor: 'feliz' }).ganhos.melodia, 'música: o humor não muda a melodia');
// 10. O som do toque: o mesmo item nunca faz o mesmo som duas vezes seguidas.
let ant = null, repetiu = 0; for (let k = 0; k < 300; k++) { const v = S.variacao('sofa'); if (v === ant) repetiu++; ant = v; } f(!repetiu, 'som: o mesmo item repetiu o som');

if (falhas.length) { console.error('Parte J (sem navegador): ' + falhas.length + ' falha(s)\n- ' + falhas.join('\n- ')); process.exit(1); }
console.log('Parte J (sem navegador): tudo certo (as camadas, a paleta, a genética, a idade, a roupa do dia, o construtor, a vista, a música e o som).');
