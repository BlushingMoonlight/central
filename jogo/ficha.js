// Central — a ficha de cada pessoa e o celular dela (rodada 9, parte I; adendo 10, itens 6 e 7; DEC-201). Tocar em
// alguém no jogo (ou na aba Pessoas do celular do Jean) abre o cartão: o nome, a idade e a relação; o que faz agora,
// onde e há quanto tempo; o humor e as barras; o trabalho e onde mora; os bens; os últimos acontecimentos. Um toque a mais
// abre a ficha completa (personalidade, história, laços, o que pensa agora). A da Morgan é só infantil e familiar (o 69
// já filtra). O celular dela é um objeto do jogo: o Jean olha a tela, como mestre, e ela nunca sabe. Lê o 69 (jogo/celular).
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const linha = (rot, acao) => `<button class="jogo__linha" data-f="${esc(acao)}">${esc(rot)}</button>`;
const barra = (rot, v) => `<div class="jogo__texto2">${esc(rot)} <span class="jogo__barra"><i style="width:${Math.max(0, Math.min(100, Math.round(v)))}%"></i></span> ${Math.round(v)}</div>`;
const BARRAS = [['fome', 'Fome'], ['energia', 'Energia'], ['social', 'Social'], ['estresse', 'Estresse']];
const TRACO = { abertura: 'Abertura', conscienciosidade: 'Organização', extroversao: 'Extroversão', amabilidade: 'Amabilidade', neuroticismo: 'Sensibilidade' };
const dinheiro = (v, m) => (m === 'BRL' ? 'R$ ' : m === 'USD' ? 'US$ ' : (m || '') + ' ') + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ctx: { folha, chamar, agora(), som, aviso(texto, tipo), antes() }
export function criarFicha(ctx) {
  const { folha } = ctx; let aberta = false, atual = null;
  const ha = (iso) => { const t = Date.parse(iso); if (!Number.isFinite(t)) return ''; const m = Math.max(0, Math.round((ctx.agora() - t) / 60000));
    return m < 1 ? 'agora há pouco' : m < 60 ? `há ${m} min` : m < 48 * 60 ? `há ${Math.round(m / 60)} h` : `há ${Math.round(m / 1440)} dias`; };
  const quando = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/New_York', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d); };
  function mostrar(html) {
    if (ctx.antes) ctx.antes();
    const nova = !aberta; aberta = true; folha.hidden = false; folha.classList.add('jogo__folha--celular'); folha.classList.toggle('jogo__folha--lado', innerWidth >= 700);
    if (nova) history.pushState({ folha: true }, '');
    folha.innerHTML = html + linha('Fechar', 'fechar');
  }
  function fechar(doHistorico) { if (!aberta) return; aberta = false; folha.hidden = true; folha.classList.remove('jogo__folha--celular', 'jogo__folha--lado'); if (!doHistorico && history.state && history.state.folha) history.back(); }
  window.addEventListener('popstate', () => { if (aberta) fechar(true); });
  const carregando = (t) => mostrar(`<p class="jogo__titulo">${esc(t)}</p><p class="jogo__texto2">Carregando…</p>`);

  function cartao(f) {
    const cab = [f.idade != null ? f.idade + ' anos' : '', f.relacao].filter(Boolean).join(' · ');
    const agora = f.agora || {}; const faz = [agora.faz, agora.onde && agora.onde !== agora.faz ? agora.onde : ''].filter(Boolean).join(', ');
    let h = `<p class="jogo__titulo">${esc(f.nome)}</p>` + (cab ? `<p class="jogo__texto2">${esc(cab)}</p>` : '')
      + (faz ? `<p class="jogo__texto">Agora: ${esc(faz)}${agora.desde ? ' · ' + esc(ha(agora.desde)) : ''}</p>` : '<p class="jogo__texto2">Sem notícias de agora.</p>')
      + (f.humor ? `<p class="jogo__texto2">Humor: ${esc(f.humor)}</p>` : '') + (f.afeto_dela != null ? barra('O que a Pepper sente', f.afeto_dela) : '')
      + (f.barras ? BARRAS.filter(([k]) => f.barras[k] != null).map(([k, n]) => barra(n, f.barras[k])).join('') : '')
      + (f.trabalho ? `<p class="jogo__texto2">Trabalho: ${esc(f.trabalho)}</p>` : '') + (f.mora ? `<p class="jogo__texto2">Mora: ${esc(f.mora)}</p>` : '');
    if ((f.bens || []).length) h += '<p class="jogo__texto2">Bens</p>' + f.bens.map((b) => `<p class="jogo__texto2">${esc(b.o_que)}: ${esc(dinheiro(b.valor, b.moeda))}</p>`).join('');
    if ((f.momentos || []).length) h += '<p class="jogo__texto2">Últimos acontecimentos</p>' + f.momentos.slice(0, 3).map((m) => `<p class="jogo__texto2">${esc(quando(m.em))} · ${esc(m.texto)}</p>`).join('');
    return h + linha('Ver a ficha completa', 'completa') + (f.quem === 'pepper' ? linha('Ver o celular dela', 'celular') : '');
  }
  function completa(f) {
    const c = f.completa || {};
    let h = `<p class="jogo__titulo">${esc(f.nome)}: a ficha</p>`;
    if ((c.personalidade || []).length) h += '<p class="jogo__texto2">Personalidade</p>' + c.personalidade.map((p) => typeof p.valor === 'number' ? barra(TRACO[p.traco] || p.traco, p.valor <= 10 ? p.valor * 10 : p.valor) : `<p class="jogo__texto2">${esc(TRACO[p.traco] || p.traco)}: ${esc(p.valor)}</p>`).join('');
    if (c.historia) h += `<p class="jogo__texto2">História</p><p class="jogo__texto">${esc(c.historia)}</p>`;
    if ((c.lacos || []).length) h += '<p class="jogo__texto2">Laços</p>' + c.lacos.map((l) => (l.afeto != null ? barra(`${l.com} (${l.tipo})`, l.afeto) : `<p class="jogo__texto2">${esc(l.com)}${l.tipo ? ' · ' + esc(l.tipo) : ''}</p>`)).join('');
    h += c.pensa ? `<p class="jogo__texto2">O que pensa agora</p><p class="jogo__texto">${esc(c.pensa)}</p>` : '';
    return h + linha('Voltar ao cartão', 'cartao');
  }
  async function abrir(quem, inteira = false) {
    atual = { quem, f: null }; carregando(quem === 'pepper' ? 'Pepper' : quem === 'jean' ? 'Jean' : quem);
    try { const r = await ctx.chamar('jogo/celular', { acao: 'ficha', quem, completa: true }); if (!atual || atual.quem !== quem) return; atual.f = r.ficha;
      mostrar(inteira ? completa(r.ficha) : cartao(r.ficha)); if (ctx.som) ctx.som.toque(); }
    catch (e) { if (aberta) mostrar(`<p class="jogo__titulo">Ficha</p><p class="jogo__texto2">${esc(e.message || 'Não deu para abrir agora.')}</p>`); }
  }

  // ---- o celular dela
  let dela = null, conversa = null;
  function telaDela() {
    const d = dela || {}; const desp = d.despertador || {};
    if (conversa) { const c = (d.conversas || []).find((x) => x.com === conversa) || { mensagens: [], momentos: [] };
      return `<p class="jogo__titulo">${esc(conversa)}</p>` + (c.mensagens.length ? c.mensagens.map((m) => `<p class="jogo__texto${m.autor === 'Pepper' ? '' : '2'}">${esc(m.autor)}: ${esc(m.texto)}</p>`).join('')
        : '<p class="jogo__texto2">Nenhuma mensagem escrita ainda. O que ela lembra de vocês:</p>' + c.momentos.map((m) => `<p class="jogo__texto2">${esc(quando(m.em))} · ${esc(m.texto)}</p>`).join(''))
        + linha('Voltar ao celular dela', 'dela'); }
    return '<p class="jogo__titulo">O celular dela</p><p class="jogo__texto2">Só você vê. Ela nunca sabe.</p>'
      + `<p class="jogo__texto">Despertador: ${esc(desp.hora || '07:00')}${desp.tocou ? ', já tocou hoje' : ''}</p>`
      + '<p class="jogo__texto2">Lista de compras</p>' + ((d.compras || []).length ? `<p class="jogo__texto">${d.compras.map(esc).join(', ')}</p>` : '<p class="jogo__texto2">Nada faltando.</p>')
      + '<p class="jogo__texto2">Conversas</p>' + ((d.conversas || []).length ? d.conversas.map((c) => linha(c.com, 'conversa:' + c.com)).join('') : '<p class="jogo__texto2">Nenhuma ainda.</p>')
      + '<p class="jogo__texto2">WhatsApp com você</p>' + ((d.whatsapp || []).length ? d.whatsapp.slice(-8).map((m) => `<p class="jogo__texto${m.autor === 'Pepper' ? '' : '2'}">${esc(m.autor)}: ${esc(m.texto)}</p>`).join('') : '<p class="jogo__texto2">Nada ainda.</p>')
      + '<p class="jogo__texto2">O diário dela</p>' + ((d.diario || []).length ? d.diario.map((x) => `<p class="jogo__texto2">${esc(String(x.dia).split('-').reverse().join('/'))} · ${esc(x.texto)}</p>`).join('') : '<p class="jogo__texto2">Nada escrito.</p>');
  }
  async function celularDela() {
    atual = null; conversa = null; carregando('O celular dela');
    try { dela = (await ctx.chamar('jogo/celular', { acao: 'dela' })).dela; if (aberta) mostrar(telaDela()); }
    catch (e) { if (aberta) mostrar(`<p class="jogo__titulo">O celular dela</p><p class="jogo__texto2">${esc(e.message || 'Não deu para abrir agora.')}</p>`); }
  }

  folha.addEventListener('click', (e) => {
    if (!aberta) return; const b = e.target.closest('[data-f]'); if (!b) return; const [a, ...resto] = b.dataset.f.split(':'); const v = resto.join(':');
    if (a === 'fechar') return fechar();
    if (a === 'completa' && atual && atual.f) return mostrar(completa(atual.f));
    if (a === 'cartao' && atual && atual.f) return mostrar(cartao(atual.f));
    if (a === 'celular') return celularDela();
    if (a === 'conversa') { conversa = v; return mostrar(telaDela()); }
    if (a === 'dela') { conversa = null; return mostrar(telaDela()); }
  });
  return { abrir, celularDela, fechar, aberta: () => aberta };
}
