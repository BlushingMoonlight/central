// Central — o que aparece por cima do jogo (DEC-176; aparelhos.md): o controle flutuante embaixo do polegar, o aviso de
// ação perto de um item ("A · Abajur"), os botões fixos opcionais, a barra do modo mover, o "reconectando" sem internet e
// a apresentação da primeira vez (curta e pulável). Nada disso pausa o jogo. Alvos de 48 px.
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PASSOS = [['A casa dela', 'Esta é a casa da Pepper, agora, em Nova York. Ela vive sozinha; você só olha.'],
  ['Tocar nos itens', 'Toque numa luz, na TV ou no gato para mexer de longe. Ela estranha, na medida certa.'],
  ['A câmera', 'Arraste para olhar em volta. No celular, troque para seguir o Jean ou deixar livre.'],
  ['O celular', 'O botão de baixo abre o seu celular: o humor dela, as notas, as pessoas, o mapa, a casa e as configurações.']];

export function criarControles({ raiz, motor, aoBotao }) {
  const el = (classe, html = '') => { const d = document.createElement('div'); d.className = classe; d.innerHTML = html; d.hidden = true; raiz.appendChild(d); return d; };
  const joy = el('jogo__joy', '<span class="jogo__joy-botao"></span>');
  const acao = document.createElement('button'); acao.className = 'jogo__acao'; acao.hidden = true; raiz.appendChild(acao);
  const offline = el('jogo__offline', 'Reconectando…'); offline.setAttribute('role', 'status');
  const mover = el('jogo__movendo', '<button class="jogo__mini" data-m="girar">Girar</button><button class="jogo__mini" data-m="cancelar">Cancelar</button>');
  const botoes = el('jogo__botoes', '<div class="jogo__dpad">' + [['cima', 0, -1, 'Cima'], ['esq', -1, 0, '‹'], ['dir', 1, 0, '›'], ['baixo', 0, 1, 'Baixo']].map(([k, x, y, s]) => `<button class="jogo__mini jogo__d-${k}" data-dx="${x}" data-dy="${y}" aria-label="${k}">${s}</button>`).join('')
    + '</div><div class="jogo__ab"><button class="jogo__mini" data-b="A">A</button><button class="jogo__mini" data-b="B">B</button><button class="jogo__mini" data-b="select">Câmera</button></div>');
  const intro = el('jogo__intro'); intro.setAttribute('role', 'dialog');
  let perto = null;
  acao.addEventListener('click', () => { if (perto) aoBotao('A'); });
  // os botões fixos: segurar a direção anda (as diagonais da tela viram as do chão)
  const solta = () => motor.direcao(0, 0);
  botoes.addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-dx]'); if (b) { e.preventDefault(); const dx = Number(b.dataset.dx), dy = Number(b.dataset.dy); motor.direcao(dx, dy); } });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) botoes.addEventListener(ev, solta);
  botoes.addEventListener('click', (e) => { const b = e.target.closest('[data-b]'); if (b) aoBotao(b.dataset.b); });
  return {
    joy(ligado, sx, sy, dx = 0, dy = 0) { joy.hidden = !ligado; if (!ligado) return; joy.style.left = sx + 'px'; joy.style.top = sy + 'px'; joy.firstChild.style.transform = `translate(${Math.round(dx)}px, ${Math.round(dy)}px)`; },
    perto(id, sx, sy, nome) { perto = id; acao.hidden = !id; if (!id) return; acao.textContent = 'A · ' + nome; acao.style.left = Math.round(sx) + 'px'; acao.style.top = Math.round(sy) + 'px'; },
    pertoAgora: () => perto,
    botoes(on) { botoes.hidden = !on; },
    offline(on) { offline.hidden = !on; },
    movendo(on, aoGirar, aoCancelar) { mover.hidden = !on; mover.onclick = (e) => { const b = e.target.closest('[data-m]'); if (!b) return; if (b.dataset.m === 'girar') aoGirar(); else aoCancelar(); }; },
    apresentacao(aoFim) {
      let k = 0; const fim = () => { intro.hidden = true; aoFim(); };
      const passo = () => { const [t, x] = PASSOS[k]; intro.innerHTML = `<p class="jogo__titulo">${esc(t)}</p><p class="jogo__texto">${esc(x)}</p><p class="jogo__texto2">${k + 1} de ${PASSOS.length}</p>`
        + `<div class="jogo__par"><button class="jogo__mini" data-i="pular">Pular</button><button class="jogo__mini" data-i="seguir">${k === PASSOS.length - 1 ? 'Começar' : 'Seguir'}</button></div>`; };
      intro.onclick = (e) => { const b = e.target.closest('[data-i]'); if (!b) return; if (b.dataset.i === 'pular' || k === PASSOS.length - 1) return fim(); k++; passo(); };
      passo(); intro.hidden = false;
    },
  };
}
