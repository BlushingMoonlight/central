// Central — a música em camadas (rodada 9, J-pesquisa; DEC-209): cada faixa tem até 5 camadas (a base, a harmonia, a
// melodia, a percussão e o ambiente) que entram e saem devagar (o crossfade), pela hora (manhã, tarde, noite e
// madrugada), pelo clima (a chuva tira a percussão), pelo humor dela e por onde o Jean está. Os temas (os leitmotivs) e as
// faixas estão em docs/jogo/musica.md (no central-sistema), com o texto para o Suno.
// Até o Jean subir as faixas, toca a trilha provisória, gerada aqui por código (notas próprias, sem copiar nada de
// ninguém). Quando houver as camadas de verdade em assets/musica/faixas.json ({ "faixa": { "base": "arquivo.mp3", ... } }),
// elas tocam no lugar, alinhadas (todas começam juntas e repetem juntas).
import * as som from './som.js';

export const CAMADAS = ['base', 'harmonia', 'melodia', 'percussao', 'ambiente'];
// As faixas provisórias: o tom (a nota MIDI da tônica), a escala, o andamento e a progressão (graus da escala).
const MAIOR = [0, 2, 4, 7, 9], MENOR = [0, 3, 5, 7, 10];
export const FAIXAS = {
  manha: { tom: 60, escala: MAIOR, bpm: 92, prog: [0, 3, 4, 2], semente: 3 },
  tarde: { tom: 62, escala: MAIOR, bpm: 84, prog: [0, 2, 3, 4], semente: 11 },
  noite: { tom: 57, escala: MENOR, bpm: 70, prog: [0, 3, 1, 4], semente: 23 },
  madrugada: { tom: 55, escala: MENOR, bpm: 58, prog: [0, 1, 3, 0], semente: 31 },
  casa_jean: { tom: 64, escala: MAIOR, bpm: 88, prog: [0, 4, 3, 1], semente: 41 },
};
// Que faixa e quanto de cada camada (de 0 a 1), sem som nenhum: o teste confere as regras daqui.
export function mistura({ hora = 12, clima = 'sol', humor = '', onde = 'casa-pepper' } = {}) {
  const faixa = onde === 'casa-jean' ? 'casa_jean' : hora >= 6 && hora < 12 ? 'manha' : hora >= 12 && hora < 18 ? 'tarde' : hora >= 18 && hora < 24 ? 'noite' : 'madrugada';
  const g = { base: 0.8, harmonia: 0.6, melodia: 0.7, percussao: 0.45, ambiente: 0.35 };
  if (faixa === 'noite') { g.percussao = 0.2; g.melodia = 0.55; } if (faixa === 'madrugada') { g.percussao = 0; g.melodia = 0.35; g.harmonia = 0.45; }
  const h = String(humor || '').toLowerCase();
  if (/triste|cansad|doente|chatead|desanim|ansios/.test(h)) { g.percussao = Math.min(g.percussao, 0.1); g.melodia *= 0.6; }
  if (/feliz|anima|contente|apaixon|radiante|empolg/.test(h)) { g.melodia = Math.min(1, g.melodia + 0.2); g.percussao = Math.min(1, g.percussao + 0.15); }
  if (clima === 'chuva' || clima === 'neve') { g.percussao = 0; g.ambiente = 0.6; } // a chuva tira a percussão, sempre (por último)
  return { faixa, ganhos: g };
}
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const acaso = (s) => { let x = s >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return (x % 10000) / 10000; }; };

export function criarMusica() {
  let ligada = false, atual = null, ganhos = {}, saida = null, ctx = null, proximo = 0, passo = 0, timer = null, stems = null, tocandoStems = null, melodia = [];
  const camadas = {};
  function montar() {
    const c = som.contexto(); if (!c) return false; if (ctx === c.ctx) return true; ctx = c.ctx; saida = c.saida;
    for (const k of CAMADAS) { camadas[k] = ctx.createGain(); camadas[k].gain.value = 0; camadas[k].connect(saida); }
    fetch('assets/musica/faixas.json').then((r) => (r.ok ? r.json() : null)).then((j) => { stems = j && typeof j === 'object' ? j : null; }).catch(() => { stems = null; });
    return true;
  }
  function nota(camada, freq, quando, dur, tipo, vol) {
    const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = tipo; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, quando); g.gain.linearRampToValueAtTime(vol, quando + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, quando + dur);
    o.connect(g).connect(camadas[camada]); o.start(quando); o.stop(quando + dur + 0.05);
  }
  function chiado(quando, dur, vol, freq) { const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = ctx.createBufferSource(); s.buffer = b; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = freq; const g = ctx.createGain(); g.gain.value = vol; s.connect(f).connect(g).connect(camadas.percussao); s.start(quando); }
  // A melodia da faixa: 16 notas da escala, sorteadas com a semente (a mesma faixa, a mesma melodia: um tema que gruda).
  function compor(F) { const r = acaso(F.semente); melodia = []; let grau = 2; for (let k = 0; k < 16; k++) { grau = Math.max(0, Math.min(9, grau + Math.round((r() - 0.5) * 3))); melodia.push(r() < 0.2 ? null : grau); } }
  // O relógio: agenda as notas um pouco à frente (a técnica do "lookahead"), uma colcheia por vez.
  function agendar() {
    if (!ligada || !ctx || !atual) return; const F = FAIXAS[atual]; const col = 60 / F.bpm / 2;
    while (proximo < ctx.currentTime + 0.2) {
      const compasso = Math.floor(passo / 8) % F.prog.length; const grauAc = F.prog[compasso]; const raiz = F.tom + F.escala[grauAc % 5] + (grauAc >= 5 ? 12 : 0);
      const k = passo % 8;
      if (k === 0) nota('base', hz(raiz - 24), proximo, col * 7, 'triangle', 0.12);
      if (k === 0 || k === 4) for (const i of [0, 2, 4]) nota('harmonia', hz(raiz + [0, F.escala[2], 7][i / 2] - 12), proximo, col * 3.5, 'sine', 0.035);
      const m = melodia[passo % 16]; if (m !== null && k % 2 === 0) nota('melodia', hz(F.tom + F.escala[m % 5] + 12 * Math.floor(m / 5)), proximo, col * 1.8, 'triangle', 0.05);
      if (k % 2 === 0) chiado(proximo, 0.05, k === 0 ? 0.05 : 0.025, k === 4 ? 3000 : 7000);
      if (k === 0 && passo % 32 === 0) nota('ambiente', hz(F.tom + 24 + F.escala[(passo / 32) % 5]), proximo, col * 14, 'sine', 0.02); // os sininhos
      proximo += col; passo++;
    }
  }
  async function tocarStems(faixa) { // as camadas de verdade (do Suno), alinhadas
    const lista = stems && stems[faixa]; if (!lista) return false; if (tocandoStems && tocandoStems.faixa === faixa) return true; pararStems();
    try { const bufs = await Promise.all(CAMADAS.map(async (k) => (lista[k] ? ctx.decodeAudioData(await (await fetch('assets/musica/' + lista[k])).arrayBuffer()) : null)));
      const t0 = ctx.currentTime + 0.1; const fontes = bufs.map((b, i) => { if (!b) return null; const s = ctx.createBufferSource(); s.buffer = b; s.loop = true; s.connect(camadas[CAMADAS[i]]); s.start(t0); return s; });
      tocandoStems = { faixa, fontes }; return true; } catch (e) { return false; }
  }
  function pararStems() { if (tocandoStems) for (const s of tocandoStems.fontes) if (s) try { s.stop(); } catch (e) { /* já parou */ } tocandoStems = null; }
  return {
    // Liga ou desliga (o volume da música em zero, ou o mudo, desliga e não gasta nada).
    async atualizar(estado = {}) {
      const v = som.volumes(); const quer = !v.mudo && v.musica > 0; if (!quer) { this.parar(); return; }
      if (!montar()) return; const { faixa, ganhos: g } = mistura(estado); ganhos = g;
      if (faixa !== atual) { atual = faixa; compor(FAIXAS[faixa]); passo = 0; proximo = ctx.currentTime + 0.1; if (stems && !(await tocarStems(faixa))) pararStems(); }
      for (const k of CAMADAS) camadas[k].gain.setTargetAtTime(g[k], ctx.currentTime, 2); // o crossfade das camadas
      if (!ligada) { ligada = true; timer = setInterval(() => { if (!tocandoStems) agendar(); }, 50); }
    },
    parar() { ligada = false; clearInterval(timer); timer = null; pararStems(); if (ctx) for (const k of CAMADAS) if (camadas[k]) camadas[k].gain.setTargetAtTime(0, ctx.currentTime, 0.5); atual = null; },
    estado: () => ({ ligada, faixa: atual, ganhos: { ...ganhos }, stems: !!tocandoStems }),
  };
}
