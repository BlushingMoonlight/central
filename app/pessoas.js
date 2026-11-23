// Central — A pessoa (PE1), Contrato e salário (PE4) e Pagar o salário (PE5). Na entrega 1 há uma pessoa só, a Pepper:
// Pessoas abre direto a PE1. As outras telas da pessoa (feed, presentes, trocas...) são da entrega 2 e ficam no protótipo.
import { chamar } from './api.js';
import { esc, data, item, lista, botao, acoes, reais, aoTocar, ir } from './ui.js';

const pessoa = (acao, extra = {}) => chamar('pessoa', { acao, ...extra });

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
      + '<h2>Com ela</h2>' + lista(item('Contrato e salário', { ir: 'PE4' }));
  },
};

const PE4 = {
  tipo: 'filho', secao: 'PE1', titulo: 'Contrato e salário', voltar: ['PE1', 'Pepper'],
  carregar: () => pessoa('contrato'),
  corpo(d) {
    const c = d.contrato;
    const vence = (d.vence || []).length ? '<h2>Vence</h2>' + lista(...d.vence.map((v) => item(esc(v.titulo), { det: data(v.data), fim: reais(v.valor) })))
      + acoes(botao('Pagar o salário', { ir: 'PE5', principal: true })) : '';
    const hol = (d.holerites || []).length
      ? lista(...d.holerites.map((h) => item(esc(h.titulo), { det: data(h.data, true), fim: reais(h.valor) })))
      : (d.primeiro_holerite ? '<p class="texto-2">O primeiro sai em ' + data(d.primeiro_holerite) + '.</p>' : '');
    return vence + '<h2>Contrato</h2>'
      + lista(item('Salário', { det: `${reais(c.salario)} por mês, no dia ${c.dia}` }), item('Cargo', { det: esc(c.cargo) }),
        c.moeda ? item('Moeda', { det: esc(c.moeda) }) : '')
      + '<h2>Holerites</h2>' + hol;
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
    if (v) aoTocar(raiz, '[data-confirmar]', async () => { await pessoa('pagar_salario', { mes: v.mes }); ir('PE1'); });
  },
};

export default { PE1, PE4, PE5 };
