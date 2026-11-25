// Central — o jogo (JG, etapa 8, entregas 1 a 3; DEC-174 a DEC-176): a casa da Pepper (ou a do Jean) em tela cheia (DEC-149).
// Carrega o Phaser 4 e a cena (jogo/), pede o estado ao servidor (o workflow 68, POST jogo/cena) a cada minuto e quando o
// app volta à frente. Tocar num item abre o menu dele (jogo/menu.js); o chip e o botão abrem o celular do Jean
// (jogo/celular.js, as 8 abas); o construtor está em jogo/construtor.js; os controles na tela, em jogo/controles.js.
// Sem internet: abre com o último estado guardado e mostra "reconectando"; o que o Jean faz fica guardado e vai depois,
// uma vez só (o id de cada ação).
import { chamar, endereco, modoDemo } from './api.js';

let motor = null; let relogio = null; let ultimo = null; let som = null; let mapaAtual = 'casa-pepper';
const CHAVE_ULTIMO = 'jogo-ultimo', CHAVE_FILA = 'jogo-fila', CHAVE_INTRO = 'jogo-apresentacao';
const ler = (k, padrao) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : padrao; } catch (e) { return padrao; } };
const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento: segue */ } };
const novoId = () => (crypto.randomUUID ? crypto.randomUUID() : 'a' + Date.now().toString(16) + Math.random().toString(16).slice(2, 10));
const carregarScript = (src) => new Promise((ok, falha) => { if (window.Phaser) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => falha(new Error('sem o motor do jogo')); document.head.appendChild(s); });
const horaEm = (fuso) => new Intl.DateTimeFormat('pt-BR', { timeZone: fuso, hour: '2-digit', minute: '2-digit' }).format(new Date());
const horaNY = () => { const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date()); return Number(p[0].value) + Number(p[2].value) / 60; };
const HUMOR = { bem: 'humor--bem', meio: 'humor--meio', mal: 'humor--mal' };
const humorDe = (t) => (/trist|brav|irrit|cansad|preocup|medo|chatead/i.test(t || '') ? 'mal' : /calm|ok|normal|neutr|pensativ/i.test(t || '') || !t ? 'meio' : 'bem');
const NOMES_PERTO = { tv: 'TV', toca_discos: 'Toca-discos', violao: 'Violão', relogio: 'Relógio', relogio_j: 'Relógio', caixa_areia: 'Areia', potes_gato: 'Potes', interruptor: 'Interruptor', geladeira: 'Geladeira' };

let ui = null; // os controles na tela (o "reconectando")
const offline = (on) => { if (ui) ui.offline(on); };
// Uma ação do Jean: vai com o mapa que ele está vendo e um id. Sem conexão, fica guardada e vai depois.
async function enviar(corpo) {
  const pedido = { ...corpo, mapa: corpo.mapa || mapaAtual }; if (pedido.acao !== 'cena') pedido.id = novoId();
  try { const r = await chamar('jogo/cena', pedido); offline(false); esvaziarFila(); return r; } catch (e) {
    if (e.tipo !== 'rede') throw e; offline(true);
    if (pedido.acao !== 'cena') { const f = ler(CHAVE_FILA, []); f.push(pedido); gravar(CHAVE_FILA, f.slice(-50)); throw new Error('Sem conexão: fica guardado e vai quando voltar.'); }
    throw e;
  }
}
let esvaziando = false;
async function esvaziarFila() {
  if (esvaziando) return; const f = ler(CHAVE_FILA, []); if (!f.length) return; esvaziando = true;
  try { while (f.length) { try { await chamar('jogo/cena', f[0]); } catch (e) { if (e.tipo === 'rede') break; } f.shift(); gravar(CHAVE_FILA, f); } } finally { esvaziando = false; }
}

function parar() { if (relogio) clearInterval(relogio); relogio = null; if (motor) { motor.destruir(); motor = null; } if (som) som.parar(); document.removeEventListener('visibilitychange', aoVoltar); window.removeEventListener('online', esvaziarFila); }
async function aoVoltar() { if (document.visibilityState === 'visible' && motor) { try { aplicar(await enviar({ acao: 'cena' })); } catch (e) { /* segue com a última cena */ } } }
let menus = null, celular = null;
function aplicar(c) {
  if (!c || !motor) return; ultimo = c; mapaAtual = c.mapa_id || mapaAtual; motor.atualizar(c);
  if (menus) for (const t of c.avisos || []) { menus.aviso(t); if (celular) celular.guardarAviso(t); }
  if ((c.avisos || []).length) document.querySelector('[data-celular]')?.classList.add('jogo__celular--novo');
  if (!c.offline) gravar(CHAVE_ULTIMO, c);
  const it = c.itens || {}; const tv = it.tv || {};
  if (som) som.atualizar({ hora: horaNY(), clima: c.clima, tv: !!tv.ligada, volumeTv: tv.volume ?? 4, mudo: !!tv.mudo, tocando: !!(it['toca-discos'] || {}).tocando, ronrom: (c.gato || {}).acao === 'ronronando' });
}

const JG = {
  tipo: 'jogo', titulo: 'Jogo',
  carregar: async () => {
    await carregarScript('jogo/phaser.min.js');
    try { return await chamar('jogo/cena', { acao: 'cena', mapa: 'casa-pepper' }); } catch (e) {
      const salvo = ler(CHAVE_ULTIMO, null); if (e.tipo === 'rede' && salvo) return { ...salvo, offline: true }; throw e; }
  },
  corpo: () => '<div class="jogo__mundo" data-mundo></div>'
    + '<button class="jogo__chip" data-chip aria-label="Hora e humor"><span data-hora></span><span class="jogo__humor" data-humor></span></button>'
    + '<button class="jogo__celular" data-celular aria-label="Celular"><span class="jogo__celular-tela"></span></button>'
    + '<div class="jogo__folha" data-folha hidden></div>',
  async depois(raiz, d, ctx) {
    parar(); mapaAtual = d.mapa_id || 'casa-pepper';
    const [{ criarJogo }, { criarMenus }, S, { criarCelular }, { criarConstrutor }, { criarControles }] = await Promise.all([import('../jogo/cena.js'), import('../jogo/menu.js'),
      import('../jogo/som.js'), import('../jogo/celular.js'), import('../jogo/construtor.js'), import('../jogo/controles.js')]);
    if (!ctx.atual()) return;
    som = S; ultimo = d; let diag = {}; let medida = null; let construtor = null;
    const jogo = raiz.querySelector('.jogo') || raiz;
    raiz.addEventListener('pointerdown', () => som.iniciar(), { once: true });
    const nomeDe = (id) => { const it = ((motor.mapa() || {}).itens || []).find((i) => i.id === id); return it ? (NOMES_PERTO[it.modelo] || (it.luz ? 'Luz' : it.inventario ? 'Abrir' : 'Item')) : ''; };
    const botao = (b) => {
      if (b === 'A') { const id = ui.pertoAgora(); const p = id && motor.posicao(id); if (id && p) menus.abrir(id, p.x, p.y); }
      else if (b === 'B') { if (history.state && (history.state.menuJogo || history.state.folha)) history.back(); }
      else if (b === 'select') { const ordem = ['pepper', 'jean', 'livre']; camera(ordem[(ordem.indexOf(motor.modoCamera()) + 1) % 3]); }
      else if (b === 'start') celular.abrir();
    };
    motor = criarJogo(window.Phaser, raiz.querySelector('[data-mundo]'), { mapa: d.mapa,
      aoDiagnostico: (x) => { diag = x; if (medida) medida.amostras.push(x.fps); },
      aoTocar: (id, sx, sy) => menus.abrir(id, sx, sy),
      aoSoltar: async (id, x, y, espelhar, tirar) => { const c = await menus.agir({ acao: 'mover', item: id, op: tirar ? 'tirar' : 'soltar', valor: { x, y, espelhar } }); if (c) { motor.cancelarMover(); ui.movendo(false); } },
      aoAndou: (x, y, andar) => { enviar({ acao: 'jean', op: 'andar', valor: { x, y, andar } }).then((c) => { if (c && c.reacao) menus.aviso('Ela viu você!'); if (c) aplicar(c); }).catch((e) => menus.aviso(e.message || 'Não deu certo agora.', 'erro')); },
      aoPerto: (id, sx, sy) => ui.perto(id, sx, sy, nomeDe(id)),
      aoBotao: botao,
      aoJoy: (on, sx, sy, dx, dy) => ui.joy(on, sx, sy, dx, dy),
      aoConstrutor: (tipo, x, y) => construtor && construtor.evento(tipo, x, y) });
    menus = criarMenus({ raiz: jogo, motor, enviar, som });
    ui = criarControles({ raiz: jogo, motor, aoBotao: botao });
    construtor = criarConstrutor({ raiz: jogo, motor, enviar: (c) => menus.agir(c), aviso: menus.aviso });
    if (modoDemo) window.jogoTeste = { motor, menus, get celular() { return celular; }, construtor };
    aplicar(d); offline(!!d.offline);
    // a câmera: seguir a Pepper (na casa dela), seguir o Jean (onde ele estiver) ou livre (DEC-176)
    async function verMapa(id) { if (id === mapaAtual && motor.mapa().id === id) return; mapaAtual = id; try { aplicar(await enviar({ acao: 'cena', mapa: id })); } catch (e) { menus.aviso(e.message || 'Sem conexão agora.', 'erro'); } }
    async function camera(modo) {
      motor.camera(modo); const j = (ultimo && ultimo.jean) || {};
      if (modo === 'pepper') await verMapa('casa-pepper'); else if (modo === 'jean' && j.mapa_id && !j.voando) await verMapa(j.mapa_id);
      if (modo === 'jean' && j.voando) menus.aviso('O Jean está viajando.'); if (modo === 'jean' && j.fora) menus.aviso('O Jean está fora de casa: ' + j.fora + '.');
      menus.aviso(modo === 'pepper' ? 'Seguindo a Pepper.' : modo === 'jean' ? 'Seguindo o Jean.' : 'Câmera livre.');
      enviar({ acao: 'jean', op: 'config', valor: { camera: modo } }).catch(() => {});
    }
    const cfg = (d.jean && d.jean.config) || {}; if (cfg.camera && cfg.camera !== 'pepper') camera(cfg.camera); ui.botoes(!!cfg.botoes);
    window.addEventListener('jogo-movendo', () => ui.movendo(true, () => motor.girar(), () => { motor.cancelarMover(); ui.movendo(false); }));
    const chip = () => { const p = (ultimo && ultimo.pepper) || {};
      raiz.querySelector('[data-hora]').textContent = horaEm('America/New_York');
      raiz.querySelector('[data-humor]').className = 'jogo__humor ' + HUMOR[humorDe(p.humor)]; };
    chip();
    relogio = setInterval(async () => { if (!ctx.atual()) { parar(); return; } chip();
      if (Date.now() % 60000 < 15000) { try { aplicar(await enviar({ acao: 'cena' })); } catch (e) { /* tenta de novo no próximo minuto */ } } }, 15000);
    document.addEventListener('visibilitychange', aoVoltar); window.addEventListener('online', () => { esvaziarFila(); aoVoltar(); });
    window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#JG')) parar(); }, { once: true });
    esvaziarFila();

    const folha = raiz.querySelector('[data-folha]');
    const diagnostico = () => {
      const mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB' : 'o aparelho não informa';
      return `<p class="jogo__titulo">Diagnóstico</p><p class="jogo__texto">FPS agora: ${Math.round(diag.fps || 0)}</p>`
        + `<p class="jogo__texto">Luzes ativas: ${diag.luzes || 0} de ${diag.total || 0} acesas (máximo 8)</p><p class="jogo__texto">Memória: ${mem}</p>`
        + `<p class="jogo__texto2">${diag.renderer || ''}, escala ${diag.escala || '?'}, tela do jogo ${diag.w || '?'} x ${diag.h || '?'}</p><p class="jogo__texto" data-medida></p>`
        + '<button class="jogo__linha" data-medir>Medir por 10 segundos</button>';
    };
    const ligarDiagnostico = (f) => f.querySelector('[data-medir]').addEventListener('click', () => { medida = { amostras: [] }; const alvo = f.querySelector('[data-medida]'); alvo.textContent = 'Medindo…';
      setTimeout(() => { const a = medida.amostras.filter((x) => x > 0); medida = null; if (!a.length) { alvo.textContent = 'Sem amostras.'; return; }
        const media = a.reduce((s, x) => s + x, 0) / a.length; alvo.textContent = `Média ${Math.round(media)} fps, mínima ${Math.round(Math.min(...a))} fps (${a.length} quadros).`; }, 10000); });
    const sair = () => { parar(); location.hash = '#AJ0'; };
    const apresentacao = () => ui.apresentacao(() => { gravar(CHAVE_INTRO, true); enviar({ acao: 'jean', op: 'config', valor: { apresentacao: true } }).catch(() => {}); });
    celular = criarCelular({ folha, motor, chamar, enviar: (c) => menus.agir(c), som, menus, ultimo: () => ultimo, camera, verMapa, diagnostico, ligarDiagnostico, sair,
      reverApresentacao: apresentacao, api: endereco, aoBotoes: (on) => ui.botoes(on),
      construir: async (id) => { await verMapa(id); construtor.abrir(); },
      tirar: (id) => { const g = (((ultimo || {}).casa || {}).guardados || []).find((x) => x.id === id); if (!g) return; motor.mover(g, true); ui.movendo(true, () => motor.girar(), () => { motor.cancelarMover(); ui.movendo(false); }); menus.aviso('Toque onde quer pôr.'); } });
    raiz.querySelector('[data-chip]').addEventListener('click', () => celular.abrir('status'));
    raiz.querySelector('[data-celular]').addEventListener('click', (e) => { e.currentTarget.classList.remove('jogo__celular--novo'); celular.abrir(); });
    // a primeira vez: a apresentação curta, que dá para pular (no aparelho e no servidor)
    if (!ler(CHAVE_INTRO, false) && !cfg.apresentacao) apresentacao();
  },
};
export default { JG };
