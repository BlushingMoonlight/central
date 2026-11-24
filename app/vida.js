// Central — Vida (VI0), Área (VI1), Tarefa (VI2), Nova área (VI3), Feitas (VI4) e Anotações do Jean (VI6).
import { chamar } from './api.js';
import { esc, data, item, lista, botao, acoes, campo, vazio, editor, prazoTexto, reais, hoje, somarDias, aoTocar, comEditor,
  comConfirmacao, ir, marcarErro } from './ui.js';
import { falarSobre } from './conversa.js';

const vida = (acao, extra = {}) => chamar('vida', { acao, ...extra });
const enc = encodeURIComponent;

function pendente(p, i) {
  if (p.tipo === 'proposta') {
    return item('Proposta: ' + esc(p.titulo), { det: esc(p.area) + (p.valor != null ? ' · ' + reais(p.valor) : '') + ' · da Pepper',
      acao: botao('Ver', { ir: 'CV2', leve: true }) });
  }
  const vencido = p.prazo && p.prazo <= hoje();
  return item(esc(p.titulo), { det: esc(p.area) + ' · ' + prazoTexto(p.prazo) + (p.valor != null ? ' · ' + reais(p.valor) : ''),
    cls: vencido ? 'item--vencido' : '', acao: botao('Feito', { principal: i === 0, leve: i > 0, attrs: ` data-feito="${esc(p.id)}"` }) });
}

const MAIS = lista(item('Feitas', { ir: 'VI4' }), item('Anotações do Jean', { ir: 'VI6' }), item('Nova área', { ir: 'VI3' }));

const VI0 = {
  tipo: 'primeiro', secao: 'VI0', titulo: 'Vida',
  carregar: () => vida('hoje'),
  corpo(d) {
    const precisa = d.precisa || [];
    // O primeiro "Feito" é a ação principal; se o primeiro item é uma proposta, o "Feito" principal é o da primeira tarefa.
    let primeira = precisa.findIndex((p) => p.tipo !== 'proposta');
    const areas = (d.areas || []).length ? lista(...d.areas.map((a) => item(esc(a.nome), { fim: String(a.abertas), ir: 'VI1/' + enc(a.id) }))) : '';
    return '<h2>Precisa de você hoje</h2>'
      + (precisa.length ? lista(...precisa.map((p, i) => pendente(p, i === primeira ? 0 : 1)))
        : vazio('Nada precisa de você hoje.', '', botao('Nova tarefa', { ir: 'K3', principal: true })))
      + (areas ? '<h2>Áreas</h2>' + areas : '') + '<h2>Mais</h2>' + MAIS;
  },
  depois(raiz, d, ctx) {
    aoTocar(raiz, '[data-feito]', async (b) => { await vida('feito', { id: b.dataset.feito }); ctx.recarregar(); });
  },
};

const VI1 = {
  tipo: 'filho', secao: 'VI0', titulo: (d) => (d ? d.area.nome : 'Área'), voltar: ['VI0', 'Vida'],
  carregar: (args) => vida('area', { area: args[0] }),
  corpo(d) {
    const nova = botao('Nova tarefa nesta área', { ir: 'K3/' + enc(d.area.id), principal: true });
    const com = d.com_prazo || [], sem = d.sem_prazo || [];
    const notas = d.area.notas ? '<h2>Notas da área</h2><p class="texto-2">' + esc(d.area.notas) + '</p>' : '';
    if (!com.length && !sem.length) return vazio(`Nenhuma tarefa aberta em ${esc(d.area.nome)}.`, '', nova) + notas;
    const t = (x) => item(esc(x.titulo), { det: x.prazo ? prazoTexto(x.prazo) : esc(x.origem || ''), ir: 'VI2/' + enc(x.id),
      cls: x.prazo && x.prazo < hoje() ? 'item--vencido' : '' });
    return acoes(nova) + (com.length ? '<h2>Com prazo</h2>' + lista(...com.map(t)) : '')
      + (sem.length ? '<h2>Sem prazo</h2>' + lista(...sem.map(t)) : '') + notas;
  },
};

const VI2 = {
  tipo: 'filho', secao: 'VI0', titulo: 'Tarefa',
  voltar: (d) => (d ? ['VI1/' + enc(d.tarefa.area_id), d.tarefa.area] : ['VI0', 'Vida']),
  carregar: (args) => vida('tarefa', { id: args[0] }),
  corpo(d) {
    const t = d.tarefa;
    const hist = (t.historico || []).map((h) => h.o_que + ' ' + data(h.quando, true)).join(' · ');
    return `<h1>${esc(t.titulo)}</h1>`
      + lista(item('Prazo', { det: t.prazo ? data(t.prazo) : 'sem prazo' }), item('Área', { det: esc(t.area) }),
        item('De onde veio', { det: esc(t.origem || '') }), t.notas ? item('Notas', { det: esc(t.notas) }) : '',
        hist ? item('Histórico', { det: hist }) : '')
      + editor('ed-prazo', campo('Prazo novo', 'prazo', { tipo: 'date', valor: t.prazo || '', nome: 'prazo' }))
      + editor('ed-area', campo('Área', 'area', { opcoes: (d.areas || []).map((a) => [a.id, a.nome]), valor: t.area_id, nome: 'area' }))
      + acoes(botao('Feito', { principal: true, attrs: ' data-feito' }), botao('Adiar', { leve: true, attrs: ' data-adiar' }),
        botao('Mudar o prazo', { leve: true, attrs: ' data-editor="ed-prazo" data-prazo' }),
        botao('Mudar de área', { leve: true, attrs: ' data-editor="ed-area" data-area' }),
        botao('Falar sobre isto', { leve: true, attrs: ' data-falar' }))
      + '<div class="perigoso">' + acoes(botao('Cancelar a tarefa', { leve: true, attrs: ' data-cancelar' }), botao('Apagar', { perigo: true, attrs: ' data-apagar' }))
      + '<p class="pequeno">Cancelar guarda no histórico. Apagar pede confirmação.</p></div>';
  },
  depois(raiz, d, ctx) {
    const t = d.tarefa, area = 'VI1/' + enc(t.area_id);
    aoTocar(raiz, '[data-feito]', async () => { await vida('feito', { id: t.id }); ir(area); });
    aoTocar(raiz, '[data-adiar]', async () => { await vida('adiar', { id: t.id, prazo: somarDias(t.prazo && t.prazo > hoje() ? t.prazo : hoje(), 1) }); ctx.recarregar(); });
    comEditor(raiz, '[data-prazo]', async (v) => {
      if (!v.prazo) { marcarErro(raiz, 'prazo', 'Escolha a data.'); return; }
      await vida('mudar', { id: t.id, campos: { prazo: v.prazo } }); ctx.recarregar();
    });
    comEditor(raiz, '[data-area]', async (v) => { await vida('mudar', { id: t.id, campos: { area: v.area } }); ctx.recarregar(); });
    raiz.querySelector('[data-falar]').addEventListener('click', () => falarSobre(`sobre a tarefa “${t.titulo}”: `));
    aoTocar(raiz, '[data-cancelar]', async () => { await vida('mudar', { id: t.id, campos: { estado: 'cancelada' } }); ir(area); });
    comConfirmacao(raiz, '[data-apagar]', async () => { await vida('apagar', { id: t.id, confirmar: true }); ir(area); });
  },
};

const VI3 = {
  tipo: 'passo', titulo: 'Nova área', voltar: ['VI0', 'Vida'],
  corpo: () => '<form>' + campo('Nome da área', 'n') + campo('Para que serve', 'p', { area: true })
    + acoes(botao('Criar a área', { principal: true, tipo: 'submit' })) + '</form>',
  depois(raiz) {
    const f = raiz.querySelector('form');
    aoTocar(raiz, '[type=submit]', async () => {
      const nome = f.querySelector('#n').value.trim();
      if (!nome) { marcarErro(raiz, 'n', 'Escreva o nome da área.'); return; }
      await vida('nova_area', { nome, para_que: f.querySelector('#p').value.trim() });
      ir('VI0');
    });
  },
};

const VI4 = {
  tipo: 'filho', secao: 'VI0', titulo: 'Feitas', voltar: ['VI0', 'Vida'],
  carregar: () => vida('feitas'),
  corpo: (d) => ((d.tarefas || []).length
    ? lista(...d.tarefas.map((t) => item(esc(t.titulo), { det: esc(t.area) + ' · feita ' + data(t.feita_em, true), cls: 'item--feito' })))
    : vazio('Nenhuma tarefa feita ainda.')),
};

const VI6 = {
  tipo: 'filho', secao: 'VI0', titulo: 'Anotações do Jean', voltar: ['VI0', 'Vida'],
  carregar: () => vida('anotacoes'),
  corpo: (d) => ((d.anotacoes || []).length
    ? '<p class="texto-2">O que você pediu para a Pepper saber.</p>'
      + lista(...d.anotacoes.map((a) => item(esc(a.titulo), { det: data(a.data, true) + (a.texto ? ' · ' + esc(a.texto) : '') })))
    : vazio('Nenhuma anotação.')),
};

export default { VI0, VI1, VI2, VI3, VI4, VI6 };
