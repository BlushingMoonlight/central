// Central — o som básico do jogo (DEC-175), sintetizado no aparelho (Web Audio), sem arquivos e sem custo: o ambiente da
// casa pela hora, a chuva, a TV, o toca-discos, o ronrom do gato e os toques da interface. Só começa depois do primeiro
// toque (a regra dos navegadores). O volume fica no aparelho.
let ctx = null, mestre = null, partes = {}, volume = 0.6;
try { const v = Number(localStorage.getItem('jogo-volume')); if (Number.isFinite(v) && localStorage.getItem('jogo-volume') !== null) volume = v; } catch (e) { /* sem armazenamento: o padrão */ }

function ruido(seg = 2) { const b = ctx.createBuffer(1, ctx.sampleRate * seg, ctx.sampleRate); const d = b.getChannelData(0); let ult = 0;
  for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; ult = (ult + 0.02 * w) / 1.02; d[i] = ult * 3.5; } return b; }
function laco(buffer, filtro, freq) { const s = ctx.createBufferSource(); s.buffer = buffer; s.loop = true; const f = ctx.createBiquadFilter(); f.type = filtro; f.frequency.value = freq;
  const g = ctx.createGain(); g.gain.value = 0; s.connect(f).connect(g).connect(mestre); s.start(); return g; }
export function iniciar() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
  ctx = new C(); mestre = ctx.createGain(); mestre.gain.value = volume; mestre.connect(ctx.destination);
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
export function mudarVolume(v) { volume = Math.max(0, Math.min(1, v)); if (mestre) mestre.gain.value = volume; try { localStorage.setItem('jogo-volume', String(volume)); } catch (e) { /* segue */ } }
export const volumeAtual = () => volume;
export function parar() { if (partes.musica) clearInterval(partes.musica); if (ctx) ctx.close(); ctx = null; partes = {}; }
