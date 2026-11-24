// Central — Finanças (FI0) e as listas FI1 a FI9.
import { chamar } from './api.js';
import { esc, data, item, lista, botao, acoes, campo, vazio, editor, reais, nomeMes, hoje, aoTocar, comEditor, comConfirmacao,
  ir, marcarErro } from './ui.js';

const fin = (acao, extra = {}) => chamar('financas', { acao, ...extra });
const enc = encodeURIComponent;
const USOS = [['pessoal', 'Pessoal'], ['saas', 'SaaS']];
const nomeUso = (u) => (u === 'saas' ? 'SaaS' : 'Pessoal');
const voltar = ['FI0', 'Finanças'];
const numeros = (...pares) => '<div class="numeros">' + pares.map(([r, v, extra]) => `<div><span class="pequeno">${r}</span><p class="grande">${v}</p>`
  + (extra ? `<span class="pequeno">${extra}</span>` : '') + '</div>').join('') + '</div>';
const valorDe = (t) => Number(String(t).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));

// O que vence: cada tipo abre a sua tela.
const ROTA = { tarefa: 'VI2', assinatura: 'FI4', parcela: 'FI5', fatura: 'FI7', divida: 'FI6' };
const rotaVence = (v) => (ROTA[v.tipo] ? ROTA[v.tipo] + (v.tipo === 'tarefa' || v.tipo === 'assinatura' ? '/' + enc(v.id) : '') : null);

const FI0 = {
  tipo: 'primeiro', secao: 'FI0', titulo: 'Finanças',
  carregar: () => fin('mes'),
  corpo(d) {
    const listas = '<h2>Listas</h2>' + lista(item('Gastos do mês', { ir: 'FI1' }),
      item('Assinaturas', { fim: d.assinaturas_mes != null ? reais(d.assinaturas_mes) + ' por mês' : '', ir: 'FI3' }),
      item('Parcelas', { ir: 'FI5' }), item('Dívidas', { ir: 'FI6' }), item('Meios de pagamento', { ir: 'FI7' }),
      item('Lista de desejos', { ir: 'FI8' }), item('Meses anteriores', { ir: 'FI9' }));
    const registrar = acoes(botao('Registrar gasto', { ir: 'K1', principal: true }));
    const mes = nomeMes(d.mes);
    const vence = (d.vence || []).length ? '<h2>Vence nos próximos 7 dias</h2>' + lista(...d.vence.map((v) => item(esc(v.titulo), {
      det: v.data === hoje() ? 'hoje' : (v.det ? esc(v.det) + ' ' : '') + data(v.data), fim: reais(v.valor),
      cls: v.data <= hoje() ? 'item--vencido' : '', ir: rotaVence(v) }))) : '';
    if (!d.pessoal && !d.saas) return registrar + vence + vazio(`Nenhum gasto em ${mes} ainda.`, ' Tire a foto da nota ou conte à Pepper.') + listas;
    return registrar + vence + `<h2>Gasto de ${mes}</h2>` + numeros(['Pessoal', reais(d.pessoal)], ['SaaS', reais(d.saas)]) + listas;
  },
};

const FI1 = {
  tipo: 'filho', secao: 'FI0', titulo: 'Gastos do mês', voltar,
  carregar: (args) => fin('gastos', args[0] ? { uso: args[0] } : {}),
  corpo(d, args) {
    const atual = args[0] || '';
    const filtro = acoes(...[['', 'Tudo'], ...USOS].map(([u, n]) => botao(n, { ir: 'FI1' + (u ? '/' + u : ''), leve: true, attrs: u === atual ? ' aria-current="true"' : '' })));
    const l = d.gastos || [];
    if (!l.length) return filtro + vazio('Nenhum gasto neste mês.');
    return filtro + lista(...l.map((g) => item(esc(g.titulo), { det: data(g.data, true) + ' · ' + esc(g.meio) + ' · ' + nomeUso(g.uso), fim: reais(g.valor), ir: 'FI2/' + enc(g.id) })));
  },
};

const FI2 = {
  tipo: 'filho', secao: 'FI0', titulo: (d) => (d ? d.gasto.titulo : 'Gasto'), voltar: ['FI1', 'Gastos do mês'],
  carregar: (args) => fin('gasto', { id: args[0] }),
  corpo(d) {
    const g = d.gasto;
    return `<p class="grande">${reais(g.valor)}</p>`
      + lista(item('Quando', { det: data(g.data) }), g.onde ? item('Onde', { det: esc(g.onde) }) : '', item('Meio', { det: esc(g.meio) }),
        item('Uso', { det: nomeUso(g.uso) }), item('Categoria', { det: esc(g.categoria || '') }),
        g.itens ? item('Itens da nota', { det: esc(g.itens) }) : '', g.parcela ? item('Parcela', { det: esc(g.parcela) }) : '')
      + editor('ed-gasto', campo('Categoria', 'cat', { valor: g.categoria || '', nome: 'categoria' }) + campo('Uso', 'uso', { opcoes: USOS, valor: g.uso, nome: 'uso' }))
      + acoes(botao('Mudar', { principal: true, attrs: ' data-editor="ed-gasto" data-mudar' }))
      + '<div class="perigoso">' + acoes(botao('Apagar o gasto', { perigo: true, attrs: ' data-apagar' })) + '</div>';
  },
  depois(raiz, d, ctx) {
    comEditor(raiz, '[data-mudar]', async (v) => { await fin('mudar', { tipo: 'gasto', id: d.gasto.id, campos: v }); ctx.recarregar(); });
    comConfirmacao(raiz, '[data-apagar]', async () => { await fin('apagar', { tipo: 'gasto', id: d.gasto.id, confirmar: true }); ir('FI1'); });
  },
};

const FI3 = {
  tipo: 'filho', secao: 'FI0', titulo: 'Assinaturas', voltar,
  carregar: () => fin('assinaturas'),
  corpo(d) {
    const l = d.assinaturas || [];
    if (!l.length) return vazio('Nenhuma assinatura registrada.');
    return numeros(['Pessoal por mês', reais(d.pessoal_mes)], ['SaaS por mês', reais(d.saas_mes)])
      + (d.total_ano != null ? `<p class="pequeno">No ano: ${reais(d.total_ano)}</p>` : '')
      + '<h2>Próxima renovação primeiro</h2>'
      + lista(...l.map((a) => item(esc(a.titulo), { det: esc(a.periodicidade) + (a.uso === 'pessoal' ? ' · Pessoal' : '') + ' · renova ' + data(a.renova),
        fim: reais(a.valor), ir: 'FI4/' + enc(a.id) })));
  },
};

const FI4 = {
  tipo: 'filho', secao: 'FI0', titulo: (d) => (d ? d.assinatura.titulo : 'Assinatura'), voltar: ['FI3', 'Assinaturas'],
  carregar: (args) => fin('assinatura', { id: args[0] }),
  corpo(d) {
    const a = d.assinatura;
    return lista(item('Valor', { det: reais(a.valor) + (a.periodicidade === 'anual' ? ' por ano' : ' por mês') }), item('Renova', { det: data(a.renova) }),
      item('Aviso antes', { det: a.aviso_dias + ' dias' }), item('Meio', { det: esc(a.meio) }), item('Uso', { det: nomeUso(a.uso) }))
      + (a.vou_cancelar ? '<div class="aviso aviso--certo" role="status"><strong>Vai cancelar.</strong> Virou tarefa, com um lembrete antes da renovação.</div>' : '')
      + editor('ed-valor', campo('Valor', 'valor', { valor: String(a.valor).replace('.', ','), nome: 'valor', extra: ' inputmode="decimal"' }))
      + acoes(a.vou_cancelar ? '' : botao('Vou cancelar', { principal: true, attrs: ' data-cancelar' }),
        botao('Mudar', { leve: true, attrs: ' data-editor="ed-valor" data-mudar' }));
  },
  depois(raiz, d, ctx) {
    aoTocar(raiz, '[data-cancelar]', async () => { await fin('vou_cancelar', { id: d.assinatura.id }); ctx.recarregar(); });
    comEditor(raiz, '[data-mudar]', async (v) => {
      const valor = valorDe(v.valor);
      if (!Number.isFinite(valor)) { marcarErro(raiz, 'valor', 'Escreva o valor em reais.'); return; }
      await fin('mudar', { tipo: 'assinatura', id: d.assinatura.id, campos: { valor } });
      ctx.recarregar();
    });
  },
};

const FI5 = {
  tipo: 'filho', secao: 'FI0', titulo: 'Parcelas', voltar,
  carregar: () => fin('parcelas'),
  corpo: (d) => ((d.parcelas || []).length
    ? lista(...d.parcelas.map((p) => item(esc(p.titulo), { det: `faltam ${p.faltam} de ${p.total}`, fim: reais(p.valor) })))
    : vazio('Nenhuma compra parcelada.')),
};

const FI6 = {
  tipo: 'filho', secao: 'FI0', titulo: 'Dívidas', voltar,
  carregar: () => fin('dividas'),
  corpo(d) {
    const devo = d.devo || [], devem = d.devem || [];
    if (!devo.length && !devem.length) return vazio('Nenhuma dívida.', ' Nem sua, nem de ninguém com você.');
    let n = 0;
    const linha = (x) => item(esc(x.quem), { det: x.prazo ? 'até ' + data(x.prazo) : 'sem prazo', fim: reais(x.valor),
      acao: botao('Marcar como paga', { principal: n++ === 0, leve: n > 1, attrs: ` data-paga="${esc(x.id)}"` }) });
    return (devo.length ? '<h2>Você deve</h2>' + lista(...devo.map(linha)) : '') + (devem.length ? '<h2>Devem a você</h2>' + lista(...devem.map(linha)) : '');
  },
  depois(raiz, d, ctx) {
    aoTocar(raiz, '[data-paga]', async (b) => { await fin('paga', { id: b.dataset.paga }); ctx.recarregar(); });
  },
};

const NOVO_CARTAO = editor('ed-cartao', campo('Nome do cartão', 'cn', { nome: 'nome' }) + campo('Os 4 últimos números', 'cl', { nome: 'final', extra: ' inputmode="numeric" maxlength="4"' })
  + campo('Fecha no dia', 'cf', { nome: 'fecha', extra: ' inputmode="numeric"' })
  + campo('Vence no dia', 'cv', { nome: 'vence', extra: ' inputmode="numeric"' })
  + '<label class="marca"><input type="checkbox" name="uso_unico"> Virtual de uso único</label>');
const FI7 = {
  tipo: 'filho', secao: 'FI0', titulo: 'Meios de pagamento', voltar,
  carregar: () => fin('meios'),
  corpo(d) {
    const novo = NOVO_CARTAO + acoes(botao('Novo cartão', { principal: true, attrs: ' data-editor="ed-cartao" data-novo' }));
    if (!(d.meios || []).length) return vazio('Nenhum meio registrado.') + novo;
    return lista(...d.meios.map((m) => item(esc(m.nome), { det: esc(m.det || '') }))) + novo;
  },
  depois(raiz, d, ctx) {
    comEditor(raiz, '[data-novo]', async (v) => {
      if (!v.nome.trim()) { marcarErro(raiz, 'cn', 'Escreva o nome do cartão.'); return; }
      if (!/^\d{4}$/.test(String(v.final || '').trim())) { marcarErro(raiz, 'cl', 'Escreva os 4 últimos números.'); return; }
      // Os nomes do workflow 43: o cartão é de crédito, e o número inteiro nunca é pedido nem guardado.
      await fin('novo_cartao', { tipo: 'credito', apelido: v.nome.trim(), final: v.final.trim(), dia_fechamento: v.fecha, dia_vencimento: v.vence,
        virtual_uso_unico: v.uso_unico === true });
      ctx.recarregar();
    });
  },
};

const NOVO_DESEJO = editor('ed-desejo', campo('O quê', 'dq', { nome: 'titulo' }) + campo('Preço estimado', 'dp', { nome: 'valor', extra: ' inputmode="decimal"' })
  + campo('Prioridade', 'dr', { opcoes: [['media', 'Normal'], ['alta', 'Alta'], ['baixa', 'Baixa']], valor: 'media', nome: 'prioridade' }));
const FI8 = {
  tipo: 'filho', secao: 'FI0', titulo: 'Lista de desejos', voltar,
  carregar: () => fin('desejos'),
  corpo(d) {
    const novo = NOVO_DESEJO + acoes(botao('Novo desejo', { principal: true, attrs: ' data-editor="ed-desejo" data-novo' }));
    if (!(d.desejos || []).length) return vazio('A lista está vazia.') + novo;
    return novo + lista(...d.desejos.map((x) => item(esc(x.titulo), { det: 'prioridade ' + esc({ media: 'normal' }[x.prioridade] || x.prioridade), fim: x.valor != null ? reais(x.valor) : '' })));
  },
  depois(raiz, d, ctx) {
    comEditor(raiz, '[data-novo]', async (v) => {
      if (!v.titulo.trim()) { marcarErro(raiz, 'dq', 'Escreva o desejo.'); return; }
      await fin('novo_desejo', { o_que: v.titulo.trim(), preco_estimado: v.valor ? valorDe(v.valor) : null, prioridade: v.prioridade });
      ctx.recarregar();
    });
  },
};

const FI9 = {
  tipo: 'filho', secao: 'FI0', titulo: 'Meses anteriores', voltar,
  carregar: () => fin('meses'),
  corpo: (d) => ((d.meses || []).length
    ? lista(...d.meses.map((m) => item(nomeMes(m.mes).replace(/^./, (c) => c.toUpperCase()), { det: `Pessoal ${reais(m.pessoal)} · SaaS ${reais(m.saas)}`, fim: reais(m.pessoal + m.saas) })))
    : vazio('Ainda não há meses anteriores.')),
};

export default { FI0, FI1, FI2, FI3, FI4, FI5, FI6, FI7, FI8, FI9 };
