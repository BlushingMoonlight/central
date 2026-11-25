// Central — a Conversa (CV, início), Buscar (CV1), Proposta (CV2) e Combinados (CV3).
import { chamar } from './api.js';
import { esc, data, diaDe, horaDe, item, lista, botao, acoes, campo, vazio, editor, aoTocar, comEditor, ir, marcarErro } from './ui.js';
import { guardar, listar as listarFila, mandarFila, aoMudar } from './fila.js';
import { segurarParaGravar, blobParaBase64 } from './midia.js';

// "Falar sobre isto": abre a conversa com o assunto já escrito na caixa.
let rascunho = '';
export function falarSobre(texto) { rascunho = texto; ir('CV'); }

const ROTA_DO_TIPO = { tarefa: 'VI2', compromisso: 'AG1', contato: 'AG3', gasto: 'FI2', assinatura: 'FI4' };
const rotaDe = (ref) => (ref && ROTA_DO_TIPO[ref.tipo] ? ROTA_DO_TIPO[ref.tipo] + '/' + encodeURIComponent(ref.id) : null);

// O histórico inteiro (DEC-177): começa pelas últimas 80; rolar até o topo traz mais 200, até acabar.
let quantas = 80;
async function carregarConversa() {
  const d = await chamar('mensagem', { acao: 'listar', quantas });
  d.pendentes = (await listarFila()).filter((i) => i.caminho === 'mensagem');
  return d;
}

function mensagensHtml(d) {
  const ms = d.mensagens || [];
  if (!ms.length && !d.pendentes.length && !d.proposta) {
    return vazio('A conversa começa aqui.', ' A Pepper manda a primeira mensagem quando a Central ligar.');
  }
  let out = acoes(botao('Buscar', { ir: 'CV1', leve: true }), botao('Combinados', { ir: 'CV3', leve: true }));
  let dia = '';
  ms.forEach((m, i) => {
    const d0 = diaDe(m.enviada_em);
    if (d0 !== dia) { dia = d0; out += `<p class="dia">${data(d0)}</p>`; }
    if (m.tipo === 'sistema') {
      out += `<p class="sistema">${esc(m.texto)}${m.desfazer ? ` <a href="#CV" data-desfazer="${esc(m.id)}">Desfazer</a>` : ''}</p>`;
      return;
    }
    const quem = m.autor === 'jean' ? 'ele' : 'ela';
    const prox = ms[i + 1];
    const fim = !prox || prox.tipo === 'sistema' || prox.autor !== m.autor || diaDe(prox.enviada_em) !== d0
      || new Date(prox.enviada_em) - new Date(m.enviada_em) > 120000;
    const hora = fim ? `<span class="hora">${horaDe(m.enviada_em)}${quem === 'ele' && m.lida_em ? ' · visto' : ''}</span>` : '';
    if (m.tipo === 'audio') {
      const dur = m.duracao ? ` · ${Math.floor(m.duracao / 60)}:${String(m.duracao % 60).padStart(2, '0')}` : '';
      out += `<div class="msg msg--${quem} msg--audio${fim ? ' msg--fim' : ''}"><p><button class="botao botao--leve" type="button" data-ouvir="${esc(m.id)}">Ouvir</button>áudio${dur}</p>`
        + (m.texto ? `<p data-transcricao="${esc(m.id)}" hidden>${esc(m.texto)}</p>` : '')
        + (m.audio_url ? `<audio data-som="${esc(m.id)}" src="${esc(m.audio_url)}" preload="none"></audio>` : '') + hora + '</div>';
      return;
    }
    out += `<div class="msg msg--${quem}${fim ? ' msg--fim' : ''}"><p>${esc(m.texto)}</p>${hora}</div>`;
  });
  for (const p of d.pendentes) {
    out += `<div class="msg msg--ele msg--fim"><p>${esc(p.corpo.texto || 'áudio')}</p><span class="hora">Não enviada · sem conexão</span></div>`;
  }
  if (d.pendentes.length) out += '<p class="sistema">Sem conexão. A mensagem sai quando a internet voltar. <a href="#CV" data-tentar-agora>Tentar agora</a></p>';
  // "Digitando…" só enquanto ela digita cada balão (DEC-142): some entre um e outro.
  if (d.escrevendo) out += '<p class="escrevendo">digitando…</p>';
  if (d.proposta) {
    const p = d.proposta;
    // A ação do Jean pela conversa (DEC-128): só acontece quando ele confirma. O pedido dela: aceitar, mudar, recusar.
    out += `<div class="proposta"><p><strong>${esc(p.titulo)}</strong> ${esc(p.resumo || '')}</p>`
      + (p.de === 'jean'
        ? acoes(botao('Confirmar', { attrs: ' data-aceitar' }), botao('Cancelar', { leve: true, attrs: ' data-recusar' }))
        : acoes(botao('Aceitar', { attrs: ' data-aceitar' }), botao('Mudar', { ir: 'CV2', leve: true }), botao('Recusar', { leve: true, attrs: ' data-recusar' })))
      + '</div>';
  }
  return out;
}

function ligarMensagens(raiz, d, recarregar) {
  const id = d.proposta && d.proposta.id;
  aoTocar(raiz, '[data-aceitar]', async () => { await chamar('proposta', { acao: 'aceitar', id }); await recarregar(); });
  aoTocar(raiz, '[data-recusar]', async () => { await chamar('proposta', { acao: 'recusar', id }); await recarregar(); });
  aoTocar(raiz, '[data-desfazer]', async (b) => { await chamar('mensagem', { acao: 'desfazer', id: b.dataset.desfazer }); await recarregar(); });
  aoTocar(raiz, '[data-tentar-agora]', async () => { await mandarFila(); await recarregar(); });
  raiz.querySelectorAll('[data-ouvir]').forEach((b) => b.addEventListener('click', () => {
    const som = raiz.querySelector(`[data-som="${b.dataset.ouvir}"]`);
    const t = raiz.querySelector(`[data-transcricao="${b.dataset.ouvir}"]`);
    if (t) t.hidden = false;
    if (som) { som.currentTime = 0; som.play().catch(() => {}); }
  }));
}

const descer = () => window.scrollTo(0, document.documentElement.scrollHeight);
const pertoDoFim = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 80;

const ESCREVER = '<form class="escrever"><label class="oculto" for="msg">Mensagem</label>'
  + '<input id="msg" placeholder="Mensagem" autocomplete="off" enterkeyhint="send">'
  + '<button class="botao segurar" type="button" data-audio>Áudio</button>'
  + '<button class="botao botao--principal" type="submit">Enviar</button></form>';

const CV = {
  tipo: 'primeiro', secao: 'CV', conversa: true,
  titulo: 'Pepper',
  sub: (d) => (d && d.visto_por_ultimo ? `visto por último às ${horaDe(d.visto_por_ultimo)}` : ''),
  rodape: ESCREVER,
  carregar: carregarConversa,
  corpo: mensagensHtml,
  depois(raiz, d, ctx) {
    const main = raiz.querySelector('main .conversa');
    let ultimo = JSON.stringify(d);
    const atualizar = async () => {
      if (!ctx.atual()) return;
      let novo;
      try { novo = await carregarConversa(); } catch (e) { return; }
      if (!ctx.atual()) return;
      const j = JSON.stringify(novo);
      if (j === ultimo) return;
      ultimo = j;
      const fim = pertoDoFim();
      main.innerHTML = mensagensHtml(novo);
      const sub = raiz.querySelector('.topo__sub');
      if (sub) sub.textContent = CV.sub(novo);
      ligarMensagens(main, novo, atualizar);
      marcarLidas(novo);
      if (fim) descer();
    };
    ligarMensagens(main, d, atualizar);
    marcarLidas(d);
    quantas = 80;
    descer();
    // Rolou até o topo e ainda há mensagens antes: traz mais, sem perder o lugar na tela.
    let temMais = !!d.tem_mais, buscando = false;
    const noTopo = async () => {
      if (!ctx.atual()) { window.removeEventListener('scroll', noTopo); return; }
      if (buscando || !temMais || window.scrollY > 60) return;
      buscando = true; quantas += 200;
      try {
        const altura = document.documentElement.scrollHeight;
        const novo = await carregarConversa();
        if (!ctx.atual()) return;
        temMais = !!novo.tem_mais; ultimo = JSON.stringify(novo);
        main.innerHTML = mensagensHtml(novo); ligarMensagens(main, novo, atualizar);
        window.scrollTo(0, document.documentElement.scrollHeight - altura + window.scrollY);
      } catch (e) { quantas -= 200; } finally { buscando = false; }
    };
    window.addEventListener('scroll', noTopo, { passive: true });
    const relogio = setInterval(() => {
      if (!ctx.atual()) { clearInterval(relogio); return; }
      if (document.visibilityState === 'visible') atualizar();
    }, 4000);
    const sair = aoMudar(() => (ctx.atual() ? atualizar() : sair()));
    const visivel = () => { if (!ctx.atual()) { document.removeEventListener('visibilitychange', visivel); return; } if (document.visibilityState === 'visible') atualizar(); };
    document.addEventListener('visibilitychange', visivel);

    const form = raiz.querySelector('.escrever');
    const caixa = form.querySelector('#msg');
    if (rascunho) { caixa.value = rascunho; rascunho = ''; caixa.focus(); }
    const enviar = async (corpo, texto) => {
      try { await chamar('mensagem', corpo); } catch (e) {
        if (e.tipo === 'sessao') { ir('entrar'); return; }
        await guardar({ caminho: 'mensagem', corpo, rotulo: texto, criada_em: corpo.escrita_em });
      }
      await atualizar();
      descer();
    };
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const texto = caixa.value.trim();
      if (!texto) { caixa.focus(); return; }
      caixa.value = '';
      await enviar({ acao: 'enviar', texto, escrita_em: new Date().toISOString() }, texto);
    });
    const audio = form.querySelector('[data-audio]');
    segurarParaGravar(audio, async (blob, segundos, mime) => {
      if (!blob.size) return;
      await enviar({ acao: 'enviar', audio_base64: await blobParaBase64(blob), mime, duracao: segundos, escrita_em: new Date().toISOString() }, 'áudio');
    }, () => {
      const p = document.createElement('p');
      p.className = 'sistema';
      p.textContent = 'Sem acesso ao microfone. Libere em Ajustes do iPhone, Central, Microfone.';
      main.append(p);
      descer();
    });
  },
};

function marcarLidas(d) {
  if (document.visibilityState !== 'visible') return;
  if ((d.mensagens || []).some((m) => m.autor !== 'jean' && m.tipo !== 'sistema' && !m.lida_em)) {
    chamar('mensagem', { acao: 'lidas' }).catch(() => {});
  }
}

// ---------- Buscar (CV1) ----------
let ultimaBusca = null;
const CV1 = {
  tipo: 'filho', secao: 'CV', titulo: 'Buscar', voltar: ['CV', 'Pepper'],
  corpo: () => '<form data-buscar>' + campo('Buscar na conversa, na memória e na Vida', 'b', { valor: ultimaBusca ? ultimaBusca.q : '' })
    + acoes(botao('Buscar', { principal: true, tipo: 'submit' })) + '</form><div data-resultados>' + resultados() + '</div>',
  depois(raiz) {
    const f = raiz.querySelector('[data-buscar]');
    f.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const q = f.querySelector('#b').value.trim();
      if (!q) return;
      const caixa = raiz.querySelector('[data-resultados]');
      try {
        const r = await chamar('buscar', { q });
        ultimaBusca = { q, resultados: r.resultados || [] };
        caixa.innerHTML = resultados();
      } catch (e) {
        if (e.tipo === 'sessao') { ir('entrar'); return; }
        caixa.innerHTML = '<div class="aviso aviso--erro" role="alert"><strong>Não deu para carregar.</strong> Confira a internet e tente de novo.</div>';
      }
    });
  },
};
function resultados() {
  if (!ultimaBusca) return '';
  const l = ultimaBusca.resultados;
  if (!l.length) return vazio(`Nada encontrado para “${esc(ultimaBusca.q)}”.`, ' Dá para perguntar à Pepper também.');
  return `<h2>${l.length} ${l.length === 1 ? 'resultado' : 'resultados'}</h2>`
    + lista(...l.map((r) => item(esc(r.trecho), { det: esc(r.origem) + (r.data ? ' · ' + data(r.data, r.origem === 'Conversa') : ''), ir: rotaDe(r.ref) })));
}

// ---------- Proposta (CV2) ----------
const CV2 = {
  tipo: 'passo', titulo: 'Proposta', voltar: ['CV', 'Pepper'],
  carregar: () => chamar('mensagem', { acao: 'listar' }),
  corpo(d) {
    const p = d.proposta;
    if (!p) return vazio('Nenhuma proposta esperando.', '', botao('Voltar à conversa', { ir: 'CV' }));
    return `<h1>${esc(p.titulo)}</h1>`
      + lista(item('O quê', { det: esc(p.o_que || p.resumo || '') }), item('Por quê', { det: esc(p.por_que || '') }), item('Depois', { det: esc(p.depois || '') }))
      + (p.de === 'jean' ? acoes(botao('Confirmar', { principal: true, attrs: ' data-aceitar' }), botao('Cancelar', { leve: true, attrs: ' data-recusar' }))
        : (p.valor != null ? editor('ed-valor', campo('Valor', 'valor', { tipo: 'text', valor: String(p.valor).replace('.', ','), nome: 'valor', extra: ' inputmode="decimal"' })) : '')
      + acoes(botao('Aceitar', { principal: true, attrs: ' data-aceitar' }),
        p.valor != null ? botao('Mudar o valor', { leve: true, attrs: ' data-editor="ed-valor" data-mudar' }) : '',
        botao('Recusar', { leve: true, attrs: ' data-recusar' })));
  },
  depois(raiz, d) {
    if (!d.proposta) return;
    const id = d.proposta.id;
    aoTocar(raiz, '[data-aceitar]', async () => {
      const ed = raiz.querySelector('#ed-valor');
      if (ed && !ed.hidden) {
        const valor = Number(raiz.querySelector('#valor').value.replace(/\./g, '').replace(',', '.'));
        if (!Number.isFinite(valor)) { marcarErro(raiz, 'valor', 'Escreva o valor em reais.'); return; }
        await chamar('proposta', { acao: 'mudar', id, valor });
        // No pedido de salário ou de adiantamento dela, o valor do Jean já passa a valer (a contraproposta, DEC-128).
        if (d.proposta.modulo === 'salario') { ir('CV'); return; }
      }
      await chamar('proposta', { acao: 'aceitar', id });
      ir('CV');
    });
    comEditor(raiz, '[data-mudar]', async () => { raiz.querySelector('[data-aceitar]').focus(); });
    aoTocar(raiz, '[data-recusar]', async () => { await chamar('proposta', { acao: 'recusar', id }); ir('CV'); });
  },
};

// ---------- Combinados (CV3) ----------
const CV3 = {
  tipo: 'filho', secao: 'CV', titulo: 'Combinados', voltar: ['CV', 'Pepper'],
  carregar: () => chamar('combinados', { acao: 'listar' }),
  corpo(d) {
    const l = d.combinados || [];
    if (!l.length) return vazio('Nenhum combinado ainda.', ' Quando vocês combinarem algo na conversa, aparece aqui.');
    return '<p class="texto-2">O que você e a Pepper combinaram. Desfazer um combinado avisa a ela.</p>'
      + lista(...l.map((c, i) => item(esc(c.texto), { det: 'desde ' + data(c.desde, true),
        acao: botao('Desfazer', { principal: i === 0, leve: i > 0, attrs: ` data-desfazer="${esc(c.id)}"` }) })));
  },
  depois(raiz, d, ctx) {
    aoTocar(raiz, '[data-desfazer]', async (b) => { await chamar('combinados', { acao: 'desfazer', id: b.dataset.desfazer }); ctx.recarregar(); });
  },
};

export default { CV, CV1, CV2, CV3 };
