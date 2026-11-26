// Central — o som básico do jogo (DEC-175), sintetizado no aparelho (Web Audio), sem arquivos e sem custo: o ambiente da
// casa pela hora, a chuva, a TV, o toca-discos, o ronrom do gato e os toques da interface. Só começa depois do primeiro
// toque (a regra dos navegadores). O volume fica no aparelho.
// Parte J (DEC-206, DEC-209): os volumes separados (a música, os sons e as vozes) e o mudo; o som de cada toque pela
// biblioteca de material × superfície × 3 variações, sintetizada aqui (código próprio, sem arquivo e sem licença de
// terceiros), com um pouco de tom e de volume ao acaso: o mesmo item nunca faz o mesmo som duas vezes seguidas.
let ctx = null, mestre = null, partes = {}, canais = {};
const VOL = { musica: 0.5, sons: 0.6, vozes: 0.8, mudo: false };
try { const v = Number(localStorage.getItem('jogo-volume')); if (Number.isFinite(v) && localStorage.getItem('jogo-volume') !== null) VOL.sons = v;
  Object.assign(VOL, JSON.parse(localStorage.getItem('jogo-volumes') || '{}') || {}); } catch (e) { /* sem armazenamento: o padrão */ }
const guardar = () => { try { localStorage.setItem('jogo-volumes', JSON.stringify(VOL)); } catch (e) { /* segue */ } };
const aplicarVolumes = () => { if (!ctx) return; for (const k of ['musica', 'sons', 'vozes']) canais[k].gain.value = VOL.mudo ? 0 : VOL[k]; };

function ruido(seg = 2) { const b = ctx.createBuffer(1, ctx.sampleRate * seg, ctx.sampleRate); const d = b.getChannelData(0); let ult = 0;
  for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; ult = (ult + 0.02 * w) / 1.02; d[i] = ult * 3.5; } return b; }
function laco(buffer, filtro, freq) { const s = ctx.createBufferSource(); s.buffer = buffer; s.loop = true; const f = ctx.createBiquadFilter(); f.type = filtro; f.frequency.value = freq;
  const g = ctx.createGain(); g.gain.value = 0; s.connect(f).connect(g).connect(mestre); s.start(); return g; }
export function iniciar() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
  ctx = new C(); for (const k of ['musica', 'sons', 'vozes']) { canais[k] = ctx.createGain(); canais[k].connect(ctx.destination); } mestre = canais.sons; aplicarVolumes();
  // em segundo plano, o som para (e volta junto com o app)
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });
  const r = ruido();
  partes.ambiente = laco(r, 'lowpass', 300);   // o zumbido da cidade e da casa
  partes.chuva = laco(r, 'highpass', 1200);    // a chuva na janela
  partes.tv = laco(r, 'bandpass', 900);        // o som baixinho da TV
  const ron = ctx.createOscillator(); ron.frequency.value = 26; const ronG = ctx.createGain(); ronG.gain.value = 0;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 3; const lfoG = ctx.createGain(); lfoG.gain.value = 0.5; lfo.connect(lfoG).connect(ronG.gain);
  ron.connect(ronG).connect(mestre); ron.start(); lfo.start(); partes.ronrom = ronG;
}
const alvo = (g, v) => { if (g) g.gain.setTargetAtTime(v, ctx.currentTime, 0.4); };
// O que está acontecendo agora: a hora de NY (noite mais quieta), o clima, a TV, o toca-discos, o gato ronronando.
export function atualizar({ hora = 12, clima = 'sol', tv = false, volumeTv = 4, mudo = false, tocando = false, ronrom = false } = {}) {
  if (!ctx) return;
  alvo(partes.ambiente, hora >= 23 || hora < 6 ? 0.05 : 0.12);
  alvo(partes.chuva, clima === 'chuva' ? 0.22 : 0);
  alvo(partes.tv, tv && !mudo ? 0.02 + 0.012 * volumeTv : 0);
  alvo(partes.ronrom, ronrom ? 0.18 : 0);
  if (tocando && !partes.musica) partes.musica = setInterval(() => nota([392, 440, 494, 523, 587, 659][Math.floor(Math.random() * 6)], 0.25, 'triangle', 0.05), 420);
  if (!tocando && partes.musica) { clearInterval(partes.musica); partes.musica = null; }
}
function nota(freq, dur = 0.08, tipo = 'square', vol = 0.06) {
  if (!ctx) return; const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = tipo; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur); o.connect(g).connect(mestre); o.start(); o.stop(ctx.currentTime + dur + 0.02);
}
// Os toques da interface, em 8 bits.
export const toque = () => nota(880, 0.05);
export const certo = () => { nota(660, 0.06); setTimeout(() => nota(990, 0.08), 70); };
export const recusa = () => nota(220, 0.15, 'square', 0.05);
export const miau = () => { nota(700, 0.12, 'triangle', 0.06); setTimeout(() => nota(520, 0.18, 'triangle', 0.05), 110); };
export function mudarVolume(v) { mudarCanal('sons', v); }
export const volumeAtual = () => VOL.sons;
// Os volumes separados (J-pesquisa): a música, os sons e as vozes (as ligações, etapa 9), de 0 a 1, e o mudo.
export function mudarCanal(k, v) { if (!(k in VOL) || k === 'mudo') return; VOL[k] = Math.round(Math.max(0, Math.min(1, v)) * 10) / 10; aplicarVolumes(); guardar(); }
export function mudo(on) { VOL.mudo = !!on; aplicarVolumes(); guardar(); }
export const volumes = () => ({ ...VOL });
// Para a música em camadas (musica.js): o contexto e a saída do canal da música.
export const contexto = () => (ctx ? { ctx, saida: canais.musica } : null);
export function parar() { if (partes.musica) clearInterval(partes.musica); if (ctx) ctx.close(); ctx = null; partes = {}; canais = {}; }

// ---------------------------------------------------------------- o som de cada toque (J3)
// material: madeira, vidro, tecido, metal, papel, ceramica; superfície (onde o item está): madeira, pedra ou tecido.
const MATERIAL = {
  madeira: (f, v) => { bip(220 * f, 0.09, 'triangle', 0.09 * v); ruidinho(900 * f, 0.03, 0.05 * v); },
  vidro: (f, v) => { bip(2200 * f, 0.25, 'sine', 0.045 * v); bip(3300 * f, 0.12, 'sine', 0.02 * v); },
  tecido: (f, v) => ruidinho(500 * f, 0.09, 0.08 * v, 'lowpass'),
  metal: (f, v) => { bip(610 * f, 0.22, 'square', 0.025 * v); bip(930 * f, 0.18, 'square', 0.02 * v); },
  papel: (f, v) => { ruidinho(2400 * f, 0.05, 0.05 * v); setTimeout(() => ruidinho(2800 * f, 0.04, 0.04 * v), 50); },
  ceramica: (f, v) => { bip(1050 * f, 0.12, 'sine', 0.06 * v); ruidinho(3000 * f, 0.02, 0.03 * v); },
};
const SUPERFICIE = { madeira: [1, 1], pedra: [1.15, 1.2], tecido: [0.85, 0.7] };
const VARIA = [1, 1.12, 0.9]; const ultima = {};
function bip(freq, dur, tipo, vol) { const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = tipo; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur); o.connect(g).connect(mestre); o.start(); o.stop(ctx.currentTime + dur + 0.02); }
let _ruido = null;
function ruidinho(freq, dur, vol, tipo = 'bandpass') { if (!_ruido) _ruido = ruido(1); const s = ctx.createBufferSource(); s.buffer = _ruido; const f = ctx.createBiquadFilter(); f.type = tipo; f.frequency.value = freq;
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur); s.connect(f).connect(g).connect(mestre); s.start(); s.stop(ctx.currentTime + dur + 0.02); }
// Escolhe a variação (nunca a mesma da última vez, para o mesmo item) e devolve qual foi (o teste confere).
export function variacao(id, sorte = Math.random) { const a = ultima[id]; let k = Math.floor(sorte() * 3) % 3; if (k === a) k = (k + 1 + Math.floor(sorte() * 2)) % 3; ultima[id] = k; return k; }
export function material(mat, id = '', superficie = 'madeira') {
  const k = variacao(id || mat); if (!ctx || !MATERIAL[mat]) return k; const [fs, vs] = SUPERFICIE[superficie] || SUPERFICIE.madeira;
  MATERIAL[mat](VARIA[k] * fs * (0.98 + Math.random() * 0.04), vs * (0.85 + Math.random() * 0.3)); return k;
}
// Os sons do prédio dela (adendo 11): o elevador, a porta do vizinho e a sirene ao longe, de vez em quando.
export function predio(tipo) { if (!ctx) return; if (tipo === 'elevador') { bip(1320, 0.3, 'sine', 0.03); setTimeout(() => bip(990, 0.4, 'sine', 0.03), 220); }
  else if (tipo === 'vizinho') { ruidinho(180, 0.12, 0.06, 'lowpass'); setTimeout(() => ruidinho(160, 0.1, 0.05, 'lowpass'), 160); }
  else if (tipo === 'sirene') { const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = 'square'; o.frequency.setValueAtTime(700, ctx.currentTime);
    for (let k = 0; k < 4; k++) { o.frequency.linearRampToValueAtTime(k % 2 ? 700 : 950, ctx.currentTime + 0.6 * (k + 1)); }
    g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.linearRampToValueAtTime(0.012, ctx.currentTime + 0.8); g.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 2.4);
    o.connect(g).connect(mestre); o.start(); o.stop(ctx.currentTime + 2.5); } }
