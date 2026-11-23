// Central — Agenda (AG0), Compromisso (AG1), Aniversários (AG2), Contato (AG3) e Novo compromisso (AG4).
import { chamar } from './api.js';
import { esc, data, diaDe, horaDe, item, lista, botao, acoes, campo, vazio, editor, reais, hoje, aoTocar, comEditor,
  comConfirmacao, ir, marcarErro } from './ui.js';
import { falarSobre } from './conversa.js';

const agenda = (acao, extra = {}) => chamar('agenda', { acao, ...extra });
const enc = encodeURIComponent;

// Cada tipo de item do dia abre a sua tela.
const ROTA = { compromisso: 'AG1', prazo: 'VI2', aniversario: 'AG3', renovacao: 'FI4', fatura: 'FI7', parcela: 'FI5' };
function itemDoDia(i) {
  const rota = ROTA[i.tipo];
  const det = [i.hora, i.det, i.valor != null ? reais(i.valor) : ''].filter(Boolean).map(esc).join(' · ');
  return item(esc(i.titulo), { det, ir: rota ? rota + (i.id && rota !== 'FI7' && rota !== 'FI5' ? '/' + enc(i.id) : '') : null,
    cls: i.tipo === 'prazo' && i.vencido ? 'item--vencido' : '' });
}

const TOPO_AG0 = acoes(botao('Novo compromisso', { ir: 'AG4', principal: true }), botao('Aniversários', { ir: 'AG2', leve: true }));
const AG0 = {
  tipo: 'primeiro', secao: 'AG0', titulo: 'Agenda',
  carregar: () => agenda('proximos'),
  corpo(d) {
    const dias = (d.dias || []).filter((x) => (x.itens || []).length);
    if (!dias.length) return TOPO_AG0 + vazio('Nada nos próximos dias.', ' Marque aqui, pela conversa ou pela captura.');
    return TOPO_AG0 + dias.map((x) => '<h2>' + data(x.data) + (x.data === hoje() ? ' · hoje' : '') + '</h2>' + lista(...x.itens.map(itemDoDia))).join('');
  },
};

const AG1 = {
  tipo: 'filho', secao: 'AG0', titulo: 'Compromisso', voltar: ['AG0', 'Agenda'],
  carregar: (args) => agenda('compromisso', { id: args[0] }),
  corpo(d) {
    const c = d.compromisso;
    const dur = c.duracao_min ? `, ${c.duracao_min % 60 ? c.duracao_min + ' minutos' : c.duracao_min / 60 + (c.duracao_min === 60 ? ' hora' : ' horas')}` : '';
    const local = c.quando ? diaDe(c.quando) + 'T' + horaDe(c.quando) : ''; // datetime-local no horário de Brasília
    return `<h1>${esc(c.o_que)}</h1>`
      + lista(item('Quando', { det: data(diaDe(c.quando)) + ' · ' + horaDe(c.quando) + dur }), c.onde ? item('Onde', { det: esc(c.onde) }) : '',
        c.com_quem ? item('Com quem', { det: esc(c.com_quem) }) : '', c.lembrete ? item('Lembrete', { det: esc(c.lembrete) }) : '')
      + editor('ed-comp', campo('O quê', 'q', { valor: c.o_que, nome: 'o_que' }) + campo('Quando', 'w', { tipo: 'datetime-local', valor: local, nome: 'quando' })
        + campo('Onde', 'o', { valor: c.onde || '', nome: 'onde' }))
      + acoes(botao('Mudar', { principal: true, attrs: ' data-editor="ed-comp" data-mudar' }), botao('Falar sobre isto', { leve: true, attrs: ' data-falar' }))
      + '<div class="perigoso">' + acoes(botao('Apagar o compromisso', { perigo: true, attrs: ' data-apagar' })) + '</div>';
  },
  depois(raiz, d, ctx) {
    const c = d.compromisso;
    comEditor(raiz, '[data-mudar]', async (v) => { await agenda('mudar', { id: c.id, campos: v }); ctx.recarregar(); });
    raiz.querySelector('[data-falar]').addEventListener('click', () => falarSobre(`sobre “${c.o_que}”: `));
    comConfirmacao(raiz, '[data-apagar]', async () => { await agenda('apagar', { id: c.id, confirmar: true }); ir('AG0'); });
  },
};

const AG2 = {
  tipo: 'filho', secao: 'AG0', titulo: 'Aniversários', voltar: ['AG0', 'Agenda'],
  carregar: () => agenda('aniversarios'),
  corpo: (d) => ((d.contatos || []).length
    ? lista(...d.contatos.map((c) => item(esc(c.nome), { det: (c.relacao ? esc(c.relacao) + ' · ' : '') + data(c.aniversario), ir: 'AG3/' + enc(c.id) })))
    : vazio('Nenhum aniversário guardado.', ' Quando você citar alguém, a Pepper pergunta.')),
};

const AG3 = {
  tipo: 'filho', secao: 'AG0', titulo: (d) => (d ? d.contato.nome : 'Contato'), voltar: ['AG2', 'Aniversários'],
  carregar: (args) => agenda('contato', { id: args[0] }),
  corpo: (d) => lista(item('Relação', { det: esc(d.contato.relacao || '') }), item('Aniversário', { det: data(d.contato.aniversario) }),
    d.contato.notas ? item('Notas', { det: esc(d.contato.notas) }) : '')
    + acoes(botao('Falar sobre isto', { principal: true, attrs: ' data-falar' })),
  depois(raiz, d) {
    raiz.querySelector('[data-falar]').addEventListener('click', () => falarSobre(`sobre ${d.contato.nome}: `));
  },
};

const AG4 = {
  tipo: 'passo', titulo: 'Novo compromisso', voltar: ['AG0', 'Agenda'],
  corpo: () => '<form>' + campo('O quê', 'q') + campo('Quando', 'w', { tipo: 'datetime-local' }) + campo('Onde', 'o')
    + acoes(botao('Salvar', { principal: true, tipo: 'submit' })) + '</form>',
  depois(raiz) {
    const f = raiz.querySelector('form');
    aoTocar(raiz, '[type=submit]', async () => {
      const o_que = f.querySelector('#q').value.trim(), quando = f.querySelector('#w').value;
      marcarErro(raiz, 'q', o_que ? '' : 'Escreva o compromisso.');
      marcarErro(raiz, 'w', quando ? '' : 'Escolha o dia e a hora.');
      if (!o_que || !quando) return;
      await agenda('novo', { o_que, quando, onde: f.querySelector('#o').value.trim() });
      ir('AG0');
    });
  },
};

export default { AG0, AG1, AG2, AG3, AG4 };
