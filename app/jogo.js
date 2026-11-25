// Central — o jogo (JG, etapa 8, entregas 1 e 2; DEC-174, DEC-175): a casa da Pepper em tela cheia (DEC-149). Carrega o
// Phaser 4 e a cena (jogo/), pede o estado ao servidor (o workflow 68, POST jogo/cena) a cada minuto e quando o app volta
// à frente. Tocar num item abre o menu dele (jogo/menu.js); o celular leva ao mover, aos guardados, aos avisos do jogo, ao
// som, ao zoom, ao diagnóstico e à saída (o celular completo, com as 8 seções, é da entrega 3).
import { chamar } from './api.js';
import { esc } from './ui.js';

let motor = null; let relogio = null; let ultimo = null; let som = null;
const carregarScript = (src) => new Promise((ok, falha) => { if (window.Phaser) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => falha(new Error('sem o motor do jogo')); document.head.appendChild(s); });
const horaEm = (fuso) => new Intl.DateTimeFormat('pt-BR', { timeZone: fuso, hour: '2-digit', minute: '2-digit' }).format(new Date());
const horaNY = () => { const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date()); return Number(p[0].value) + Number(p[2].value) / 60; };
const HUMOR = { bem: 'humor--bem', meio: 'humor--meio', mal: 'humor--mal' };
const humorDe = (t) => (/trist|brav|irrit|cansad|preocup|medo|chatead/i.test(t || '') ? 'mal' : /calm|ok|normal|neutr|pensativ/i.test(t || '') || !t ? 'meio' : 'bem');
const TIPOS = [['estranhou', 'Ela estranhou algo'], ['medo', 'Ela ficou com medo'], ['gato', 'O gato (fome, areia, saúde)'], ['chegou', 'Ela chegou em casa'], ['casa', 'A casa']];
const enviar = (corpo) => chamar('jogo/cena', corpo);

function parar() { if (relogio) clearInterval(relogio); relogio = null; if (motor) { motor.destruir(); motor = null; } if (som) som.parar(); document.removeEventListener('visibilitychange', aoVoltar); }
async function aoVoltar() { if (document.visibilityState === 'visible' && motor) { try { aplicar(await enviar({ acao: 'cena' })); } catch (e) { /* segue com a última cena */ } } }
let menus = null;
function aplicar(c) {
  ultimo = c; motor.atualizar(c); if (menus) for (const t of c.avisos || []) menus.aviso(t);
  const it = c.itens || {}; const tv = it.tv || {};
  if (som) som.atualizar({ hora: horaNY(), clima: c.clima, tv: !!tv.ligada, volumeTv: tv.volume ?? 4, mudo: !!tv.mudo, tocando: !!(it['toca-discos'] || {}).tocando, ronrom: (c.gato || {}).acao === 'ronronando' });
}

const JG = {
  tipo: 'jogo', titulo: 'Jogo',
  carregar: async () => { await carregarScript('jogo/phaser.min.js'); return enviar({ acao: 'cena' }); },
  corpo: () => '<div class="jogo__mundo" data-mundo></div>'
    + '<button class="jogo__chip" data-chip aria-label="Hora e humor"><span data-hora></span><span class="jogo__humor" data-humor></span></button>'
    + '<button class="jogo__celular" data-celular aria-label="Celular"><span class="jogo__celular-tela"></span></button>'
    + '<div class="jogo__folha" data-folha hidden></div>',
  async depois(raiz, d, ctx) {
    parar();
    const [{ criarJogo }, { criarMenus }, S] = await Promise.all([import('../jogo/cena.js'), import('../jogo/menu.js'), import('../jogo/som.js')]);
    if (!ctx.atual()) return;
    som = S; ultimo = d; let diag = {}; let medida = null; let movendo = null;
    const jogo = raiz.querySelector('.jogo') || raiz;
    raiz.addEventListener('pointerdown', () => som.iniciar(), { once: true });
    motor = criarJogo(window.Phaser, raiz.querySelector('[data-mundo]'), { mapa: d.mapa,
      aoDiagnostico: (x) => { diag = x; if (medida) medida.amostras.push(x.fps); },
      aoTocar: (id, sx, sy) => menus.abrir(id, sx, sy),
      aoSoltar: async (id, x, y, espelhar, tirar) => { const c = await menus.agir({ acao: 'mover', item: id, op: tirar ? 'tirar' : 'soltar', valor: { x, y, espelhar } }); if (c) { movendo = null; motor.cancelarMover(); } } });
    menus = criarMenus({ raiz: jogo, motor, enviar, som });
    if (/[?&]demo=1/.test(location.search)) window.jogoTeste = { motor, menus };
    aplicar(d);
    window.addEventListener('jogo-movendo', (e) => { movendo = e.detail; });
    const chip = () => { const p = (ultimo && ultimo.pepper) || {};
      raiz.querySelector('[data-hora]').textContent = horaEm('America/New_York');
      raiz.querySelector('[data-humor]').className = 'jogo__humor ' + HUMOR[humorDe(p.humor)]; };
    chip();
    relogio = setInterval(async () => { if (!ctx.atual()) { parar(); return; } chip();
      if (Date.now() % 60000 < 15000) { try { aplicar(await enviar({ acao: 'cena' })); } catch (e) { /* tenta de novo no próximo minuto */ } } }, 15000);
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#JG')) parar(); }, { once: true });

    // A folha (o que o chip e o celular abrem). O "voltar" do Android fecha a folha antes de sair do jogo (DEC-172).
    const folha = raiz.querySelector('[data-folha]');
    const fechar = () => { if (!folha.hidden) { folha.hidden = true; if (history.state && history.state.folha) history.back(); } };
    const abrir = (html, ligar) => { const novo = folha.hidden; folha.innerHTML = html + '<button class="jogo__linha" data-fechar>Fechar</button>'; folha.hidden = false;
      if (novo) history.pushState({ folha: true }, ''); folha.querySelector('[data-fechar]').addEventListener('click', fechar); if (ligar) ligar(folha); };
    window.addEventListener('popstate', () => { if (!folha.hidden) folha.hidden = true; });
    raiz.querySelector('[data-chip]').addEventListener('click', () => { const p = (ultimo && ultimo.pepper) || {}; const ca = (ultimo && ultimo.casa) || {};
      abrir(`<p class="jogo__titulo">Pepper</p><p class="jogo__texto">${esc(p.atividade || 'em casa')}${p.humor ? ' · ' + esc(p.humor) : ''}</p>`
        + `<p class="jogo__texto2">Nova York ${esc(horaEm('America/New_York'))} · Canoinhas ${esc(horaEm('America/Sao_Paulo'))}</p>`
        + `<p class="jogo__texto2">A casa: ${ca.ambiente ?? '?'} de 100${ca.louca ? ' · louça na pia' : ''}${ca.lixo >= 60 ? ' · lixo cheio' : ''}${ca.roupa ? ' · roupa no cesto' : ''}</p>`); });
    const diagnostico = () => {
      const mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB' : 'o aparelho não informa';
      return `<p class="jogo__titulo">Diagnóstico</p><p class="jogo__texto">FPS agora: ${Math.round(diag.fps || 0)}</p>`
        + `<p class="jogo__texto">Luzes ativas: ${diag.luzes || 0} de ${diag.total || 0} acesas (máximo 8)</p><p class="jogo__texto">Memória: ${esc(mem)}</p>`
        + `<p class="jogo__texto2">${esc(diag.renderer || '')}, escala ${diag.escala || '?'}, tela do jogo ${diag.w || '?'} x ${diag.h || '?'}</p><p class="jogo__texto" data-medida></p>`
        + '<button class="jogo__linha" data-medir>Medir por 10 segundos</button>';
    };
    const celular = () => {
      const ca = (ultimo && ultimo.casa) || {}; const guardados = ca.guardados || [];
      const topo = movendo ? '<p class="jogo__titulo">Movendo</p><p class="jogo__texto2">Toque no chão para soltar.</p><button class="jogo__linha" data-girar>Girar</button><button class="jogo__linha" data-cancelar>Cancelar</button>'
        : '<p class="jogo__titulo">Celular</p><p class="jogo__texto2">Para mover um item, toque nele e escolha Mover.</p>';
      abrir(topo + (guardados.length ? '<p class="jogo__texto2">Guardados</p>' + guardados.map((g) => `<button class="jogo__linha" data-tirar="${esc(g.id)}">Pôr de volta: ${esc(String(g.modelo).replace(/_/g, ' '))}</button>`).join('') : '')
        + '<button class="jogo__linha" data-avisos>Avisos do jogo</button>'
        + `<div class="jogo__par"><button class="jogo__mini" data-som="-" aria-label="Som mais baixo">‹</button><span class="jogo__texto" data-vol>Som ${Math.round(som.volumeAtual() * 10)}</span><button class="jogo__mini" data-som="+" aria-label="Som mais alto">›</button></div>`
        + '<button class="jogo__linha" data-mais>Mais perto</button><button class="jogo__linha" data-menos>Mais longe</button>'
        + '<button class="jogo__linha" data-diag>Diagnóstico</button><button class="jogo__linha" data-sair>Sair do jogo</button>', (f) => {
        const em = (s, fn) => { const b = f.querySelector(s); if (b) b.addEventListener('click', fn); };
        em('[data-girar]', () => motor.girar()); em('[data-cancelar]', () => { motor.cancelarMover(); movendo = null; fechar(); });
        f.querySelectorAll('[data-tirar]').forEach((b) => b.addEventListener('click', () => { const g = guardados.find((x) => x.id === b.dataset.tirar); fechar(); motor.mover(g, true); movendo = g.id; menus.aviso('Toque onde quer pôr.'); }));
        f.querySelectorAll('[data-som]').forEach((b) => b.addEventListener('click', () => { som.iniciar(); som.mudarVolume(som.volumeAtual() + (b.dataset.som === '+' ? 0.1 : -0.1)); f.querySelector('[data-vol]').textContent = 'Som ' + Math.round(som.volumeAtual() * 10); som.toque(); }));
        em('[data-mais]', () => motor && motor.zoom(1)); em('[data-menos]', () => motor && motor.zoom(-1));
        em('[data-sair]', () => { folha.hidden = true; parar(); location.hash = '#AJ0'; });
        em('[data-avisos]', () => avisos(f));
        em('[data-diag]', () => { f.innerHTML = diagnostico() + '<button class="jogo__linha" data-fechar>Fechar</button>';
          f.querySelector('[data-fechar]').addEventListener('click', fechar);
          f.querySelector('[data-medir]').addEventListener('click', () => { medida = { amostras: [] }; const alvo = f.querySelector('[data-medida]'); alvo.textContent = 'Medindo…';
            setTimeout(() => { const a = medida.amostras.filter((x) => x > 0); medida = null; if (!a.length) { alvo.textContent = 'Sem amostras.'; return; }
              const media = a.reduce((s, x) => s + x, 0) / a.length; alvo.textContent = `Média ${Math.round(media)} fps, mínima ${Math.round(Math.min(...a))} fps (${a.length} quadros).`; }, 10000); }); });
      });
    };
    // Os avisos do jogo (DEC-175): na hora, por tipo; o silêncio é opcional e começa desligado.
    const avisos = (f) => {
      const cfg = (ultimo && ultimo.casa && ultimo.casa.avisos) || { tipos: {}, silencio: { ligado: false, de: 22, ate: 7 } };
      const tipos = Object.assign({ estranhou: true, medo: true, gato: true, chegou: true, casa: true }, cfg.tipos); const sil = Object.assign({ ligado: false, de: 22, ate: 7 }, cfg.silencio);
      f.innerHTML = '<p class="jogo__titulo">Avisos do jogo</p><p class="jogo__texto2">Chegam na hora em que acontecem.</p>'
        + TIPOS.map(([k, n]) => `<label class="jogo__linha jogo__marca"><input type="checkbox" data-tipo="${k}"${tipos[k] ? ' checked' : ''}> ${esc(n)}</label>`).join('')
        + `<label class="jogo__linha jogo__marca"><input type="checkbox" data-silencio${sil.ligado ? ' checked' : ''}> Silêncio das ${sil.de}h às ${sil.ate}h (Canoinhas)</label>`
        + '<button class="jogo__linha" data-salvar>Salvar</button><button class="jogo__linha" data-fechar>Fechar</button>';
      f.querySelector('[data-fechar]').addEventListener('click', fechar);
      f.querySelector('[data-salvar]').addEventListener('click', async () => {
        const valor = { tipos: Object.fromEntries([...f.querySelectorAll('[data-tipo]')].map((c) => [c.dataset.tipo, c.checked])), silencio: { ...sil, ligado: f.querySelector('[data-silencio]').checked } };
        if (await menus.agir({ acao: 'avisos', valor })) { menus.aviso('Avisos salvos.'); fechar(); }
      });
    };
    raiz.querySelector('[data-celular]').addEventListener('click', celular);
  },
};
export default { JG };
