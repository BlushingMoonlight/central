// Central — A pessoa (PE1), Contrato e salário (PE4) e Pagar o salário (PE5). Na entrega 1 há uma pessoa só, a Pepper:
// Pessoas abre direto a PE1. As outras telas da pessoa (feed, presentes, trocas...) são da entrega 2 e ficam no protótipo.
import { chamar } from './api.js';
import { esc, data, item, lista, botao, acoes, reais, aoTocar, ir, campo, editor, comEditor, marcarErro } from './ui.js';

const pessoa = (acao, extra = {}) => chamar('pessoa', { acao, ...extra });

const valorDe = (t) => { const v = String(t || '').trim().replace(/r\$|\s/gi, ''); const n = Number(v.replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) ? n : NaN; };
const fmtData = (iso) => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; };

// Os pedidos dela que mexem no Jean (DEC-128): aceitar, contrapropor (o valor dele passa a valer) ou recusar.
function pedidos(d) {
  const l = (d.propostas || []).filter((p) => p.de !== 'jean');
  const esperando = (d.propostas || []).filter((p) => p.de === 'jean');
  return (l.length ? '<h2>Pedidos dela</h2>' + lista(...l.map((p) => item(esc(p.titulo), { det: esc(p.resumo || ''), cls: 'item--atencao',
    acao: acoes(botao('Aceitar', { attrs: ` data-aceitar="${esc(p.id)}"` }), p.valor != null ? botao('Mudar o valor', { leve: true, attrs: ` data-editor="ed-p-${esc(p.id)}" data-contra="${esc(p.id)}"` }) : '',
      botao('Recusar', { leve: true, attrs: ` data-recusar="${esc(p.id)}"` }))
      + (p.valor != null ? editor('ed-p-' + esc(p.id), campo('O seu valor, em reais', 'pv-' + esc(p.id), { nome: 'valor', extra: ' inputmode="decimal"' })) : '') }))) : '')
    + (esperando.length ? '<h2>Esperando você confirmar</h2>' + lista(...esperando.map((p) => item(esc(p.titulo), {
      acao: acoes(botao('Confirmar', { attrs: ` data-aceitar="${esc(p.id)}"` }), botao('Cancelar', { leve: true, attrs: ` data-recusar="${esc(p.id)}"` })) }))) : '');
}
function ligarPedidos(raiz, ctx) {
  aoTocar(raiz, '[data-aceitar]', async (b) => { await chamar('proposta', { acao: 'aceitar', id: b.dataset.aceitar }); ctx.recarregar(); });
  aoTocar(raiz, '[data-recusar]', async (b) => { await chamar('proposta', { acao: 'recusar', id: b.dataset.recusar }); ctx.recarregar(); });
  comEditor(raiz, '[data-contra]', async (v, b) => {
    const valor = valorDe(v.valor);
    if (!(valor > 0)) { marcarErro(raiz, 'pv-' + b.dataset.contra, 'Escreva o valor em reais.'); return; }
    await chamar('proposta', { acao: 'mudar', id: b.dataset.contra, valor }); ctx.recarregar();
  });
}

const PE1 = {
  tipo: 'primeiro', secao: 'PE1', titulo: (d) => (d ? d.nome : 'Pepper'),
  sub: (d) => (d ? esc(d.cargo) + ' · desde ' + data(d.desde, true) : ''),
  carregar: () => pessoa('resumo'),
  corpo(d) {
    const pend = d.pendente || [];
    const salario = pend.find((p) => p.tipo === 'salario');
    return '<h2>Pendente com ela</h2>'
      + (pend.length ? lista(...pend.map((p) => item(esc(p.titulo), { det: esc(p.det || ''), fim: p.valor != null ? reais(p.valor) : '', cls: 'item--atencao' })))
        : '<p class="texto-2">Nada pendente.</p>')
      + (salario ? acoes(botao('Pagar o salário', { ir: 'PE5', principal: true })) : '')
      + pedidos(d)
      + '<h2>Com ela</h2>' + lista(item('Contrato e salário', { ir: 'PE4' }));
  },
  depois(raiz, d, ctx) { ligarPedidos(raiz, ctx); },
};

// As ações do Jean no salário (DEC-128): 1º toque abre o valor; 2º confere e diz o que vai acontecer; 3º manda, uma vez só.
const ACOES_SALARIO = [
  { attr: 'mudar', nome: 'Mudar o salário', acao: 'mudar_salario', campos: (c) => campo('Salário novo por mês (R$)', 'sv', { nome: 'valor', extra: ' inputmode="decimal"' })
      + campo('A partir de', 'sd', { tipo: 'date', nome: 'desde' }),
    montar: (v, c) => { const valor = valorDe(v.valor); if (!(valor > 0)) return { erro: ['sv', 'Escreva o valor em reais.'] };
      return { dados: { valor, desde: v.desde || undefined }, texto: `O salário passa de ${reais(c.salario)} para ${reais(valor)} por mês${v.desde ? ', a partir de ' + fmtData(v.desde) : ''}.` }; } },
  { attr: 'aumento', nome: 'Aumento', acao: 'dar_aumento', campos: () => campo('Aumento (%)', 'sp', { nome: 'percentual', extra: ' inputmode="decimal"' }),
    montar: (v, c) => { const p = valorDe(v.percentual); if (!(p > 0)) return { erro: ['sp', 'Escreva o percentual.'] };
      return { dados: { percentual: p }, texto: `Aumento de ${String(p).replace('.', ',')}%: o salário passa de ${reais(c.salario)} para ${reais(Math.round(c.salario * (1 + p / 100) * 100) / 100)} por mês.` }; } },
  { attr: 'bonus', nome: 'Bônus', acao: 'bonus', campos: () => campo('Bônus (R$)', 'bv', { nome: 'valor', extra: ' inputmode="decimal"' }) + campo('Motivo', 'bm', { nome: 'motivo' }),
    montar: (v) => { const valor = valorDe(v.valor); if (!(valor > 0)) return { erro: ['bv', 'Escreva o valor em reais.'] };
      return { dados: { valor, motivo: v.motivo || '' }, texto: `Bônus de ${reais(valor)}${v.motivo ? ' (' + v.motivo + ')' : ''}, na conta dela hoje.` }; } },
  { attr: 'adiantamento', nome: 'Adiantamento', acao: 'adiantamento', campos: () => campo('Adiantamento (R$)', 'av', { nome: 'valor', extra: ' inputmode="decimal"' }),
    montar: (v, c) => { const valor = valorDe(v.valor); if (!(valor > 0)) return { erro: ['av', 'Escreva o valor em reais.'] };
      if (valor > c.salario) return { erro: ['av', 'O adiantamento vai até o valor de um salário.'] };
      return { dados: { valor }, texto: `Adiantamento de ${reais(valor)}, na conta dela hoje; sai do próximo salário.` }; } },
];

const PE4 = {
  tipo: 'filho', secao: 'PE1', titulo: 'Contrato e salário', voltar: ['PE1', 'Pepper'],
  carregar: () => pessoa('contrato'),
  corpo(d) {
    const c = d.contrato;
    const vence = (d.vence || []).length ? '<h2>Vence</h2>' + lista(...d.vence.map((v) => item(esc(v.titulo), { det: data(v.data), fim: reais(v.valor) })))
      + acoes(botao('Pagar o salário', { ir: 'PE5', principal: true })) : '';
    const hol = (d.holerites || []).length
      ? lista(...d.holerites.map((h) => item(esc(h.titulo), { det: data(h.data, true) + (h.desconto ? ' · desconto de ' + reais(h.desconto) : ''), fim: reais(h.valor) })))
      : (d.primeiro_holerite ? '<p class="texto-2">O primeiro sai em ' + data(d.primeiro_holerite) + '.</p>' : '');
    const extras = (d.extras || []).length ? '<h2>Bônus e adiantamentos</h2>' + lista(...d.extras.map((x) => item(x.tipo === 'bonus' ? 'Bônus' : 'Adiantamento', {
      det: data(String(x.criado_em).slice(0, 10), true) + (x.motivo ? ' · ' + esc(x.motivo) : '') + (x.tipo === 'adiantamento' ? (x.descontado_em ? ' · descontado' : ' · sai do próximo salário') : ''),
      fim: reais(x.valor) }))) : '';
    return vence + pedidos(d) + '<h2>Contrato</h2>'
      + lista(item('Salário', { det: `${reais(c.salario)} por mês, no dia ${c.dia}` }), item('Cargo', { det: esc(c.cargo) }),
        c.moeda ? item('Moeda', { det: esc(c.moeda) }) : '')
      + ACOES_SALARIO.map((a) => editor('ed-' + a.attr, a.campos(c))).join('')
      + acoes(...ACOES_SALARIO.map((a) => botao(a.nome, { leve: true, attrs: ` data-editor="ed-${a.attr}" data-salario="${a.attr}"` })))
      + extras + '<h2>Holerites</h2>' + hol;
  },
  depois(raiz, d, ctx) {
    ligarPedidos(raiz, ctx);
    const c = d.contrato || {};
    comEditor(raiz, '[data-salario]', async (v, b) => {
      const a = ACOES_SALARIO.find((x) => x.attr === b.dataset.salario);
      if (b.dataset.enviado) return;
      const m = a.montar(v, c);
      if (m.erro) { marcarErro(raiz, m.erro[0], m.erro[1]); return; }
      if (!b.dataset.confirmando) {
        b.dataset.confirmando = '1';
        const aviso = document.createElement('div');
        aviso.className = 'aviso aviso--atencao'; aviso.setAttribute('role', 'alert');
        aviso.innerHTML = `<strong>Toque de novo para confirmar.</strong> ${esc(m.texto)}`;
        b.closest('.acoes').after(aviso);
        return;
      }
      b.dataset.enviado = '1';
      try { await pessoa(a.acao, m.dados); } catch (e) { delete b.dataset.enviado; delete b.dataset.confirmando; throw e; }
      ctx.recarregar();
    });
  },
};

const PE5 = {
  tipo: 'passo', titulo: 'Pagar o salário', voltar: ['PE1', 'Pepper'],
  carregar: () => pessoa('contrato'),
  corpo(d) {
    const v = (d.vence || [])[0];
    if (!v) return '<p class="texto-2">Nenhum salário vencendo agora.</p>' + acoes(botao('Cancelar', { ir: 'PE1', leve: true }));
    return `<h1>${esc(v.titulo.replace(/ \(.*\)$/, ''))}</h1>`
      + lista(item('Valor', { det: reais(v.valor) + (v.det ? ' (' + esc(v.det) + ')' : '') }), item('Data', { det: data(v.data) }),
        item('Na conta dela', { det: 'em dólar, pelo câmbio do dia' }), item('Holerite', { det: 'sai junto' }))
      + acoes(botao('Confirmar', { principal: true, attrs: ' data-confirmar' }), botao('Cancelar', { ir: 'PE1', leve: true }))
      + '<p class="pequeno">Dinheiro do mundo dela. Nada sai da sua conta real.</p>';
  },
  depois(raiz, d) {
    const v = (d.vence || [])[0];
    if (v) aoTocar(raiz, '[data-confirmar]', async () => { await pessoa('pagar_salario', { mes: v.mes, confirmar: true }); ir('PE1'); });
  },
};

export default { PE1, PE4, PE5 };
