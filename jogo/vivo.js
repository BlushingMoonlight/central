// Central — tudo o que pode se mexer, se mexe (rodada 9, adendo 11; DEC-207): a animação de ambiente, só no aparelho, sem
// servidor e sem IA. A vista de cada janela do fundo (a cidade do alto, no apartamento dela no Brooklyn; o quintal e a rua,
// na casa do Jean), com a hora certa do fuso da casa e o clima de verdade (a chuva escorrendo no vidro, a neve, a neblina, o
// pôr do sol, as estrelas, as luzes das janelas, os carros lá embaixo, o avião piscando, a ponte, a escada de incêndio); e
// os itens vivos: os peixes e as bolhas do aquário, a luminária de lava, a planta perto da janela, a cortina, a chama da
// vela, o fogo da lareira, o vapor da caneca, os ponteiros dos relógios e o rabo do gato.
// O desempenho: poucos quadros (de 4 a 8 por segundo), só o que está na tela, nada em segundo plano; no modo econômico
// (a bateria baixa, o "reduzir movimento" do aparelho ou a escolha do Jean), fica só o essencial (a vista parada e a TV).
import { novoItem, BX, BY, PAL, mistura, hex } from './arte.js';

// ---------------------------------------------------------------- o vidro da janela (os pixels da face, de 0 a 1)
// O mesmo desenho de arte.js (parede, tipo "janela"): o vidro vai de 0,2 a 0,8 da largura, da altura 16 a 38.
export function vidro(lado, altura = 48) {
  const n = lado === 'n'; const p = novoItem(n ? 1 : 0.25, n ? 0.25 : 1, altura + 4); const px = [];
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    const a = (x + 0.5 - p.ox) / BX; // ao longo da parede: n, a = u - 0,25; w, a = 0,25 - v
    const u = n ? a + 0.25 : 0.25 - a; const z = p.oy + (0.25 + u) * BY - (y + 0.5);
    if (u < 0.2 || u > 0.8 || z < 16 || z > 38) continue;
    px.push([x, y, (u - 0.2) / 0.6, 1 - (z - 16) / 22]);
  }
  return { w: p.w, h: p.h, ancora: p.ancora, px };
}
const hash = (a, b = 0, c = 0) => { let x = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; x = (x ^ (x >>> 13)) * 1274126177; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
// A cor do céu pela hora (0 a 24), da mais alta (topo) à mais baixa (horizonte).
export function ceu(h) {
  const noite = ['#141a3a', '#2a2a55'], dia = ['#6b9ee0', '#cfe6ff'], tarde = ['#5d4f9a', '#ffb07a'], manha = ['#7f8fd0', '#ffd0a0'];
  const k = (a, b, t) => [mistura(a[0], b[0], t), mistura(a[1], b[1], t)];
  if (h < 5 || h >= 20.5) return noite; if (h < 6) return k(noite, manha, h - 5); if (h < 7.5) return k(manha, dia, (h - 6) / 1.5);
  if (h < 17) return dia; if (h < 18.5) return k(dia, tarde, (h - 17) / 1.5); return k(tarde, noite, (h - 18.5) / 2);
}
// A cor de um pixel da vista. tipo: "cidade" (do alto) ou "quintal" (térreo). e: { h, clima, t, escada, semente }.
export function pintar(tipo, u, v, x, y, e) {
  const [c0, c1] = ceu(e.h); const noite = e.h < 6 || e.h >= 19.5; const s = e.semente || 1; const q = Math.floor(e.t / 125); let c = mistura(c0, c1, Math.min(1, v * 1.3));
  if (noite && v < 0.45 && hash(x, y, s) > 0.93 && hash(x, y, Math.floor(e.t / 900)) > 0.25 && e.clima !== 'chuva' && e.clima !== 'nublado') c = '#fff4e0'; // as estrelas
  if (e.clima === 'nublado' || e.clima === 'chuva') c = mistura(c, noite ? '#3a3550' : '#b7b2c4', 0.55);
  if (tipo === 'cidade') {
    // o avião, de vez em quando, piscando lá no alto
    const voo = (e.t / 1000) % 40; if (voo < 12 && Math.abs(v - 0.12) < 0.05 && Math.abs(u - voo / 12) < 0.06) c = Math.floor(e.t / 400) % 2 ? '#ff5a5a' : '#fff4e0';
    // a ponte ao longe
    if (Math.abs(v - 0.5) < 0.03 || ((Math.abs(u - 0.3) < 0.03 || Math.abs(u - 0.7) < 0.03) && v > 0.38 && v < 0.55)) c = noite ? (hash(x, 9, s) > 0.6 ? '#ffd98a' : '#3a3550') : '#8a8aa8';
    // os prédios do outro lado (do alto, os topos), com as janelas acendendo e apagando à noite
    const col = Math.floor(x / 3); const alto = 0.42 + hash(col, 3, s) * 0.3;
    if (v > alto) { c = noite ? '#2b2140' : mistura('#6f6a7a', '#b78a8f', hash(col, 5, s) * 0.5);
      if ((x % 3) && (y % 2) && hash(x, y, s + Math.floor(e.t / 20000) * (x % 7 === 0 ? 1 : 0)) > (noite ? 0.55 : 0.85)) c = noite ? '#ffd98a' : '#a9c4e8'; }
    // a rua lá embaixo, com os carros (os faróis à noite)
    if (v > 0.9) { c = noite ? '#1a1424' : '#4a4458'; const carro = (Math.floor(e.t / 90) + x * 7 + y * 3) % 23; if (carro < 2) c = noite ? (y % 2 ? '#fff4e0' : '#ff5a5a') : ['#e0405a', '#3b6fb5', '#e0b440'][x % 3]; }
    // a escada de incêndio, de ferro, na frente da janela (com o vaso e a caneca)
    if (e.escada) { if (Math.abs(v - 0.72) < 0.03 || v > 0.96 || (v > 0.72 && x % 3 === 0)) c = '#2a2633';
      if (v > 0.62 && v < 0.72 && u < 0.25) c = v < 0.67 ? PAL.verde : PAL.telha; if (v > 0.66 && v < 0.72 && u > 0.78 && u < 0.88) c = PAL.creme; }
  } else {
    // o quintal: as árvores, a rua atrás da cerca, a cerca e a grama
    if (v > 0.35 && v < 0.7 && hash(Math.floor(x / 4), 11, s) > 0.4 && (u * 7 + v * 3) % 1 > 0.2) c = noite ? '#1f3a30' : (y + x) % 3 ? PAL.verde : PAL.verdeEsc;
    if (v > 0.66 && v < 0.72) c = noite ? '#2b2140' : '#6f6a7a';
    if (noite && v > 0.4 && v < 0.46 && Math.abs(u - 0.8) < 0.05) c = '#ffcf7a'; // o poste
    if (v > 0.72 && v < 0.84 && x % 2 === 0) c = noite ? '#4a2f3a' : PAL.madeira;
    if (v >= 0.84) c = noite ? '#1f3a30' : (x + y) % 4 ? PAL.verde : PAL.verdeClaro;
  }
  if (e.clima === 'neblina') c = mistura(c, '#cfd0d8', 0.6);
  if (e.clima === 'chuva') { if ((x * 3 + y + q) % 9 === 0) c = mistura(c, PAL.azulGelo, 0.7); if (hash(x, Math.floor((y + q * 0.5) / 4), s) > 0.97) c = PAL.azulGelo; } // a chuva e a gota que escorre
  if (e.clima === 'neve' && hash(x, Math.floor(y - q * 0.3), s) > 0.94) c = '#fff8ec';
  return c;
}

// ---------------------------------------------------------------- o modo econômico
let economia = false;
try { economia = localStorage.getItem('jogo-economia') === '1'; } catch (e) { /* sem armazenamento: desligado */ }
try { if (matchMedia('(prefers-reduced-motion: reduce)').matches) economia = true; } catch (e) { /* sem matchMedia */ }
let bateria = false;
try { if (navigator.getBattery) navigator.getBattery().then((b) => { const ver = () => { bateria = !b.charging && b.level <= 0.2; }; ver(); b.addEventListener('levelchange', ver); b.addEventListener('chargingchange', ver); }).catch(() => {}); } catch (e) { /* sem a API */ }
export const economico = () => economia || bateria;
export function mudarEconomia(on) { economia = !!on; try { localStorage.setItem('jogo-economia', on ? '1' : '0'); } catch (e) { /* segue */ } }

// ---------------------------------------------------------------- a cena viva
const ANIMADOS = new Set(['aquario', 'lava', 'vela', 'lareira', 'caneca', 'relogio', 'relogio_j', 'planta_grande', 'planta_pequena', 'planta_pendurada', 'vasinhos', 'cortina']);
export function criarVivo(cena, horaFn) {
  let janelas = [], itens = [], ultJanela = 0, ultItem = 0; const contagem = { quadros: 0 };
  const visivel = (x, y, m = 40) => { const v = cena.cameras.main.worldView; return x > v.x - m && x < v.right + m && y > v.y - m && y < v.bottom + m; };
  // a hora certa do fuso de cada casa (a mesma da luz da cena; na demonstração, ?hora= força)
  const horaDa = () => { if (horaFn) return horaFn(); const f = (cena.mapaTodo && cena.mapaTodo.fuso) || 'America/New_York';
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: f, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date()).map((x) => [x.type, x.value]));
    return Number(p.hour) + Number(p.minute) / 60; };
  function limpar(lista) { for (const o of lista) { if (o.img) o.img.destroy(); if (o.g) o.g.destroy(); if (o.chave && cena.textures.exists(o.chave)) cena.textures.remove(o.chave); } }
  return {
    ligada: () => !economico(),
    contagem,
    // O rabo do gato: parado, mexe de vez em quando; dormindo, devagar (adendo 11).
    rabo(t, dorme) { const k = Math.floor(t / (dorme ? 900 : 260)) % (dorme ? 4 : 12); return dorme ? (k === 1 ? '-r1' : '') : k === 3 ? '-r1' : k === 4 ? '-r2' : k === 5 ? '-r1' : ''; },
    // As janelas do fundo: uma textura por janela, só com os pixels do vidro.
    montarJanelas(lista) {
      limpar(janelas); janelas = [];
      const m = cena.mapaTodo || {}; const tipo = m.vista === 'quintal' ? 'quintal' : m.vista === 'cidade' ? 'cidade' : null; if (!tipo) return;
      lista.forEach((j, k) => { const V = vidro(j.lado); const chave = `vista-${m.id}-${cena.andar}-${k}`; if (cena.textures.exists(chave)) cena.textures.remove(chave);
        const tex = cena.textures.createCanvas(chave, V.w, V.h); const img = cena.add.image(j.s.x, j.s.y, chave).setOrigin(...V.ancora).setDepth(j.s.depth + 0.0005);
        const esc = m.escada_incendio; const comEscada = Array.isArray(esc) && esc[0] === j.x && esc[1] === j.y && (esc[2] || 'n') === j.lado;
        janelas.push({ V, tex, img, chave, tipo, escada: comEscada, semente: 7 + k * 13 }); });
      ultJanela = 0;
    },
    // Os itens com vida própria: um desenho por cima, de poucos pixels.
    montarItens() {
      limpar(itens); itens = [];
      for (const it of (cena.mapa || {}).itens || []) { if (!ANIMADOS.has(it.modelo)) continue; const s = cena.sprites[it.id]; if (!s) continue;
        const g = cena.add.graphics().setDepth(s.depth + 0.001); itens.push({ it, s, g, x0: s.x, semente: (it.id.length * 31) % 97 }); }
      ultItem = 0;
    },
    atualizar(t) {
      if (typeof document !== 'undefined' && document.hidden) return; // em segundo plano, nada
      const eco = economico();
      // as janelas: 4 quadros por segundo (8 com chuva ou neve); no econômico, 1 a cada 10 segundos
      const clima = cena.clima || 'sol'; const passo = eco ? 10000 : clima === 'chuva' || clima === 'neve' ? 200 : 333;
      if (janelas.length && t - ultJanela >= passo) { ultJanela = t; const h = horaDa(); const T = eco ? 0 : t;
        for (const j of janelas) { if (!visivel(j.img.x, j.img.y)) continue; const ctx = j.tex.getContext(); const img = ctx.createImageData(j.V.w, j.V.h);
          for (const [x, y, u, v] of j.V.px) { const [r, g, b] = hex(pintar(j.tipo, u, v, x, y, { h, clima, t: T, escada: j.escada, semente: j.semente })); img.data.set([r, g, b, 255], (y * j.V.w + x) * 4); }
          ctx.putImageData(img, 0, 0); j.tex.refresh(); contagem.quadros++; } }
      if (eco) { for (const o of itens) { o.g.clear(); o.s.x = o.x0; } return; }
      if (t - ultItem < 125) return; ultItem = t; const est = (cena.estado || {}).itens || {}; const h = horaDa(); const ventilando = clima === 'sol' && h > 9 && h < 19;
      const W = (x, y, z) => [(x - y) * BX, (x + y) * BY - z]; // um ponto do item no mundo (o mesmo isométrico da cena)
      for (const o of itens) { const { it, s, g } = o; g.clear(); if (!visivel(s.x, s.y)) continue; const e = est[it.id] || {}; const z0 = Number(it.z) || 0; const k = Math.floor(t / 125);
        const px = (x, y, c, w = 1, hh = 1) => { g.fillStyle(parseInt(c.slice(1), 16), 1); g.fillRect(Math.round(x), Math.round(y), w, hh); };
        if (it.modelo === 'aquario') { const [bx, by] = W(it.x + 0.5, it.y + 0.95, z0 + 10); for (let f = 0; f < 2; f++) { const a = (t / (1800 + f * 700) + f * 2) % 2; const dx = (a < 1 ? a : 2 - a) * 14 - 7; px(bx + dx, by - 4 - f * 5, f ? PAL.vermelho : PAL.amarelo, 2, 1); }
          for (let b = 0; b < 3; b++) { const f = ((t / 1400) + b / 3) % 1; px(bx - 4 + b * 4, by - 1 - f * 12, PAL.azulGelo); } }
        else if (it.modelo === 'lava') { const [bx, by] = W(it.x + 0.2, it.y + 0.3, z0 + 3); if (e.ligada !== false) for (let b = 0; b < 2; b++) { const f = (Math.sin(t / (2600 + b * 900) + b * 3) + 1) / 2; px(bx - 1 + b, by - 2 - f * 6, PAL.amarelo, 1, 2); } }
        else if (it.modelo === 'vela') { const [bx, by] = W(it.x + 0.15, it.y + 0.15, z0 + 6); if (e.ligada !== false) { const tr = hash(k, 1, o.semente) > 0.5 ? 1 : 0; px(bx, by - 2 - tr, PAL.amarelo, 1, 2); px(bx, by - 3 - tr, '#fff4e0'); } }
        else if (it.modelo === 'lareira') { const [bx, by] = W(it.x + it.w / 2, it.y + it.d, z0 + 2); if (e.ligada !== false) for (let f = 0; f < 6; f++) { const a = hash(k, f, o.semente); px(bx - 6 + f * 2, by - 1 - a * 6, a > 0.5 ? PAL.amarelo : '#ff8a3c', 2, 2 + Math.round(a * 2)); } }
        else if (it.modelo === 'caneca') { const [bx, by] = W(it.x + 0.15, it.y + 0.15, z0 + 4); const quente = (cena.pepper || {}).usando || ['cafe', 'ler', 'trabalho', 'celular'].includes((((cena.estado || {}).pepper || {}).acao || {}).tipo) || (h >= 6 && h < 10);
          if (quente) for (let v = 0; v < 2; v++) { const f = ((t / 1600) + v / 2) % 1; px(bx + Math.sin(f * 6 + v) * 1.5, by - 1 - f * 8, '#e8e4ec'); } }
        else if (it.modelo === 'relogio' || it.modelo === 'relogio_j') { const f = e.fuso || (it.modelo === 'relogio_j' ? 'America/Sao_Paulo' : 'America/New_York');
          const pt = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: f, hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' }).formatToParts(new Date()).map((x) => [x.type, x.value]));
          const [cx, cy] = it.modelo === 'relogio' ? W(it.x + 0.3, it.y + 0.15, z0 + 5) : W(it.x + 0.15, it.y + 0.3, z0 + 5); const am = (Number(pt.minute) / 60) * Math.PI * 2, ah = ((Number(pt.hour) % 12) / 12) * Math.PI * 2 + am / 12;
          px(cx + Math.round(Math.sin(am) * 2), cy - Math.round(Math.cos(am) * 2), PAL.contorno); px(cx + Math.round(Math.sin(ah)), cy - Math.round(Math.cos(ah)), PAL.vermelho); }
        else if (it.modelo === 'cortina' || /^planta|vasinhos/.test(it.modelo)) { // balança de leve com a janela aberta (dia de sol) ou com vento
          const perto = it.modelo === 'cortina' || (cena.mapa.aberturas || []).some((a) => a.tipo === 'janela' && Math.hypot(a.em[0] - it.x, a.em[1] - it.y) < 3);
          s.x = o.x0 + (perto && ventilando ? Math.round(Math.sin(t / 900 + o.semente) * 0.6) : 0); }
      }
    },
    destruir() { limpar(janelas); limpar(itens); janelas = []; itens = []; },
  };
}
