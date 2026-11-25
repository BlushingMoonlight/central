// Central — o jogo (JG, etapa 8, entrega 1): a casa da Pepper viva, em tela cheia (DEC-149). Carrega o Phaser 4 e a cena
// (jogo/), pede o estado ao servidor (o workflow 68, POST jogo/cena) a cada minuto e quando o app volta à frente.
// Na tela, só o chip de hora e humor e o botão do celular (aparelhos.md). O celular completo é da entrega 3; por enquanto
// ele leva a sair, ao zoom e ao diagnóstico (FPS, luzes, memória).
import { chamar } from './api.js';
import { esc } from './ui.js';

let motor = null; let relogio = null; let ultimo = null;
const carregarScript = (src) => new Promise((ok, falha) => { if (window.Phaser) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => falha(new Error('sem o motor do jogo')); document.head.appendChild(s); });
const horaEm = (fuso) => new Intl.DateTimeFormat('pt-BR', { timeZone: fuso, hour: '2-digit', minute: '2-digit' }).format(new Date());
const HUMOR = { bem: 'humor--bem', meio: 'humor--meio', mal: 'humor--mal' };
const humorDe = (t) => (/trist|brav|irrit|cansad|preocup|medo|chatead/i.test(t || '') ? 'mal' : /calm|ok|normal|neutr|pensativ/i.test(t || '') || !t ? 'meio' : 'bem');

function parar() { if (relogio) clearInterval(relogio); relogio = null; if (motor) { motor.destruir(); motor = null; } document.removeEventListener('visibilitychange', aoVoltar); }
async function aoVoltar() { if (document.visibilityState === 'visible' && motor) { try { ultimo = await chamar('jogo/cena'); motor.atualizar(ultimo); } catch (e) { /* segue com a última cena */ } } }

const JG = {
  tipo: 'jogo', titulo: 'Jogo',
  carregar: async () => { await carregarScript('jogo/phaser.min.js'); return chamar('jogo/cena'); },
  corpo: () => '<div class="jogo__mundo" data-mundo></div>'
    + '<button class="jogo__chip" data-chip aria-label="Hora e humor"><span data-hora></span><span class="jogo__humor" data-humor></span></button>'
    + '<button class="jogo__celular" data-celular aria-label="Celular"><span class="jogo__celular-tela"></span></button>'
    + '<div class="jogo__folha" data-folha hidden></div>',
  async depois(raiz, d, ctx) {
    parar();
    const { criarJogo } = await import('../jogo/cena.js');
    if (!ctx.atual()) return;
    ultimo = d; let diag = {}; let medida = null;
    const pai = raiz.querySelector('[data-mundo]');
    motor = criarJogo(window.Phaser, pai, { mapa: d.mapa, aoDiagnostico: (x) => { diag = x; if (medida) medida.amostras.push(x.fps); } });
    motor.atualizar(d);
    const chip = () => { const p = (ultimo && ultimo.pepper) || {};
      raiz.querySelector('[data-hora]').textContent = horaEm('America/New_York');
      raiz.querySelector('[data-humor]').className = 'jogo__humor ' + HUMOR[humorDe(p.humor)]; };
    chip();
    relogio = setInterval(async () => { if (!ctx.atual()) { parar(); return; } chip();
      if (Date.now() % 60000 < 15000) { try { ultimo = await chamar('jogo/cena'); motor.atualizar(ultimo); } catch (e) { /* tenta de novo no próximo minuto */ } } }, 15000);
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#JG')) parar(); }, { once: true });

    // A folha (o que o chip e o celular abrem). O "voltar" do Android fecha a folha antes de sair do jogo (DEC-172).
    const folha = raiz.querySelector('[data-folha]');
    const fechar = () => { if (!folha.hidden) { folha.hidden = true; if (history.state && history.state.folha) history.back(); } };
    const abrir = (html, ligar) => { folha.innerHTML = html + '<button class="jogo__linha" data-fechar>Fechar</button>'; folha.hidden = false;
      history.pushState({ folha: true }, ''); folha.querySelector('[data-fechar]').addEventListener('click', fechar); if (ligar) ligar(folha); };
    window.addEventListener('popstate', () => { if (!folha.hidden) folha.hidden = true; });
    raiz.querySelector('[data-chip]').addEventListener('click', () => { const p = (ultimo && ultimo.pepper) || {};
      abrir(`<p class="jogo__titulo">Pepper</p><p class="jogo__texto">${esc(p.atividade || 'em casa')}${p.humor ? ' · ' + esc(p.humor) : ''}</p>`
        + `<p class="jogo__texto2">Nova York ${esc(horaEm('America/New_York'))} · Canoinhas ${esc(horaEm('America/Sao_Paulo'))}</p>`); });
    const diagnostico = () => {
      const mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB' : 'o aparelho não informa';
      return `<p class="jogo__titulo">Diagnóstico</p><p class="jogo__texto">FPS agora: ${Math.round(diag.fps || 0)}</p>`
        + `<p class="jogo__texto">Luzes ativas: ${diag.luzes || 0} de ${diag.total || 0} acesas (máximo 8)</p><p class="jogo__texto">Memória: ${esc(mem)}</p>`
        + `<p class="jogo__texto2">${esc(diag.renderer || '')}, escala ${diag.escala || '?'}, tela do jogo ${diag.w || '?'} x ${diag.h || '?'}</p><p class="jogo__texto" data-medida></p>`
        + '<button class="jogo__linha" data-medir>Medir por 10 segundos</button>';
    };
    raiz.querySelector('[data-celular]').addEventListener('click', () => abrir('<p class="jogo__titulo">Celular</p>'
      + '<button class="jogo__linha" data-mais>Mais perto</button><button class="jogo__linha" data-menos>Mais longe</button>'
      + '<button class="jogo__linha" data-diag>Diagnóstico</button><button class="jogo__linha" data-sair>Sair do jogo</button>', (f) => {
      f.querySelector('[data-mais]').addEventListener('click', () => motor && motor.zoom(1));
      f.querySelector('[data-menos]').addEventListener('click', () => motor && motor.zoom(-1));
      f.querySelector('[data-sair]').addEventListener('click', () => { folha.hidden = true; parar(); location.hash = '#AJ0'; });
      f.querySelector('[data-diag]').addEventListener('click', () => { f.innerHTML = diagnostico() + '<button class="jogo__linha" data-fechar>Fechar</button>';
        f.querySelector('[data-fechar]').addEventListener('click', fechar);
        f.querySelector('[data-medir]').addEventListener('click', () => { medida = { amostras: [] }; const alvo = f.querySelector('[data-medida]'); alvo.textContent = 'Medindo…';
          setTimeout(() => { const a = medida.amostras.filter((x) => x > 0); medida = null; if (!a.length) { alvo.textContent = 'Sem amostras.'; return; }
            const media = a.reduce((s, x) => s + x, 0) / a.length; alvo.textContent = `Média ${Math.round(media)} fps, mínima ${Math.round(Math.min(...a))} fps (${a.length} quadros).`; }, 10000); }); });
    }));
  },
};
export default { JG };
