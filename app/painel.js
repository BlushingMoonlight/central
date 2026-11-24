// Central — o Painel do Jean (PJ0 a PJ13, só os da entrega 1). Entra-se pelos Ajustes, sem segunda senha (DEC-116).
// Cada tela chama painel/<tela> com {acao:'ler'} e as ações da tela.
import { chamar } from './api.js';
import { esc, data, item, lista, botao, acoes, campo, vazio, editor, dolares, porcento, aoTocar, comEditor, comConfirmacao } from './ui.js';

const painel = (tela, acao = 'ler', extra = {}) => chamar('painel/' + tela, { acao, ...extra });
const numeros = (...pares) => '<div class="numeros">' + pares.map(([r, v, extra]) => `<div><span class="pequeno">${r}</span><p class="grande">${v}</p>`
  + (extra ? `<span class="pequeno">${extra}</span>` : '') + '</div>').join('') + '</div>';
const P = { tipo: 'painel', voltar: ['PJ0', 'Painel'] };
const numeroDe = (t) => Number(String(t).replace(',', '.'));

const TUDO = [['PJ1', 'Custos'], ['PJ2', 'Mundo'], ['PJ3', 'Cânone'], ['PJ4', 'Pessoas'], ['PJ5', 'Chaves'], ['PJ6', 'Cúpula'],
  ['PJ7', 'Carteira e conta'], ['PJ9', 'Módulos'], ['PJ10', 'Pedidos de função'], ['PJ12', 'Registros e falhas'], ['PJ13', 'Sistema']];

const PJ0 = {
  tipo: 'painel', titulo: 'Painel', voltar: ['AJ0', 'Ajustes'],
  carregar: () => painel('hoje'),
  corpo: (d) => (d.falhas_abertas ? `<div class="aviso aviso--erro" role="alert"><strong>${d.falhas_abertas} ${d.falhas_abertas === 1 ? 'falha aberta' : 'falhas abertas'}.</strong> Veja em Registros e falhas.</div>`
    : '<div class="aviso aviso--certo">Nenhuma falha aberta.</div>')
    + numeros(['IA hoje', dolares(d.ia_hoje_usd)], ['IA no mês', dolares(d.ia_mes_usd), 'de ' + dolares(d.teto_mes_usd)])
    + '<h2>Pedidos de função</h2>' + ((d.pedidos || []).length ? lista(...d.pedidos.map((p) => item(esc(p.titulo), { det: esc(p.det || '') }))) : '<p class="texto-2">Nenhum pedido novo.</p>')
    + acoes(botao('Ver os pedidos', { ir: 'PJ10', principal: true }))
    + '<h2>Mundo</h2>' + lista(item(esc(d.mundo.estado), { det: 'último ciclo ' + esc(d.mundo.ultimo_ciclo) }), item('Backup', { det: esc(d.backup) }))
    + '<h2>Tudo</h2>' + lista(...TUDO.map(([c, n]) => item(n, { ir: c }))),
};

const PJ1 = {
  ...P, titulo: 'Custos',
  carregar: () => painel('custos'),
  corpo: (d) => '<h2>Pepper, hoje, por camada</h2>' + lista(...(d.camadas || []).map((c) => item(esc(c.nome), { det: esc(c.det), fim: dolares(c.usd) })))
    + '<h2>No mês</h2>' + lista(...(d.mes || []).map((m) => item(esc(m.pessoa), { det: `teto ${dolares(m.teto_usd)}, com o motor dentro`, fim: dolares(m.usd) })))
    + editor('ed-teto', campo('Teto do mês (US$)', 'tm', { valor: String(d.teto_mes_usd), nome: 'mes', extra: ' inputmode="decimal"' })
      + campo('Teto do motor por dia (US$)', 'td', { valor: String(d.teto_motor_dia_usd), nome: 'motor_dia', extra: ' inputmode="decimal"' }))
    + acoes(botao('Mudar um teto', { principal: true, attrs: ' data-editor="ed-teto" data-teto' })),
  depois(raiz, d, ctx) {
    comEditor(raiz, '[data-teto]', async (v) => { await painel('custos', 'mudar_teto', { mes: numeroDe(v.mes), motor_dia: numeroDe(v.motor_dia) }); ctx.recarregar(); });
  },
};

const PJ2 = {
  ...P, titulo: 'Mundo',
  carregar: () => painel('mundo'),
  corpo: (d) => lista(item('Estado', { det: esc(d.estado) }), item('Ritmo', { det: `de ${d.ritmo_min} minutos a ${d.ritmo_max / 60} horas entre ciclos` }),
    item('Teto do motor', { det: `${dolares(d.teto_motor_dia_usd)} por dia · hoje ${dolares(d.motor_hoje_usd)}` }))
    + '<h2>Últimos ciclos</h2>' + ((d.ciclos || []).length ? lista(...d.ciclos.map((c) => item(esc(c.hora), { det: `${c.eventos} eventos`, fim: dolares(c.usd) }))) : '<p class="texto-2">Nenhum ciclo ainda.</p>')
    + editor('ed-ritmo', campo('Mínimo entre ciclos (minutos)', 'rmin', { valor: String(d.ritmo_min), nome: 'min', extra: ' inputmode="numeric"' })
      + campo('Máximo entre ciclos (minutos)', 'rmax', { valor: String(d.ritmo_max), nome: 'max', extra: ' inputmode="numeric"' }))
    + acoes(botao(d.pausado ? 'Retomar o mundo' : 'Pausar o mundo', { principal: true, attrs: ' data-pausar' }),
      botao('Mudar o ritmo', { leve: true, attrs: ' data-editor="ed-ritmo" data-ritmo' })),
  depois(raiz, d, ctx) {
    aoTocar(raiz, '[data-pausar]', async () => { await painel('mundo', d.pausado ? 'retomar' : 'pausar'); ctx.recarregar(); });
    comEditor(raiz, '[data-ritmo]', async (v) => { await painel('mundo', 'mudar_ritmo', { min: Number(v.min), max: Number(v.max) }); ctx.recarregar(); });
  },
};

const PJ3 = {
  ...P, titulo: 'Cânone',
  carregar: () => painel('canone'),
  corpo(d) {
    const l = d.eventos || [];
    if (!l.length) return vazio('O mundo ainda não começou.');
    let n = 0;
    return lista(...l.map((e) => {
      const pode = e.estado === 'aceito';
      const acao = pode ? editor('ed-c-' + esc(e.id), campo('Como foi', 'c-' + esc(e.id), { valor: e.texto, nome: 'texto' }))
        + botao('Corrigir', { principal: n++ === 0, leve: n > 1, attrs: ` data-editor="ed-c-${esc(e.id)}" data-corrigir="${esc(e.id)}"` }) : '';
      return item(esc(e.hora) + ' · ' + esc(e.texto), { det: esc(e.origem) + ' · ' + esc(e.estado) + (e.motivo ? ': ' + esc(e.motivo) : ''), acao });
    }));
  },
  depois(raiz, d, ctx) {
    comEditor(raiz, '[data-corrigir]', async (v, b) => { await painel('canone', 'corrigir', { id: b.dataset.corrigir, texto: v.texto }); ctx.recarregar(); });
  },
};

const PJ4 = {
  ...P, titulo: 'Pessoas',
  carregar: () => painel('pessoas'),
  corpo: (d) => lista(...(d.pessoas || []).map((p) => item(esc(p.nome), { det: `${esc(p.estado)} · teto ${dolares(p.teto_usd)} por mês` })))
    + '<h2>Modelos da Pepper</h2>' + lista(...(d.modelos || []).map((m) => item(esc(m.camada), { det: esc(m.modelo) })))
    + '<h2>Permissões</h2>' + lista(...(d.permissoes || []).map((p) => item(esc(p.caminho), { det: esc(p.acesso) })))
    + editor('ed-ficha', campo('O que mudar na ficha', 'fi', { area: true, nome: 'texto' }))
    + editor('ed-modelos', campo('O que mudar nos modelos', 'mo', { area: true, nome: 'texto' }))
    + acoes(botao('Mudar a ficha', { leve: true, attrs: ' data-editor="ed-ficha" data-ficha' }), botao('Mudar os modelos', { leve: true, attrs: ' data-editor="ed-modelos" data-modelos' }))
    + '<p class="pequeno">Mudar a personalidade ou os modelos roda os testes antes.</p>'
    + '<div class="perigoso">' + acoes(botao('Desligar a Pepper', { perigo: true, attrs: ' data-desligar' })) + '</div>',
  depois(raiz, d, ctx) {
    comEditor(raiz, '[data-ficha]', async (v) => { await painel('pessoas', 'mudar_ficha', { pessoa_id: 'pepper', texto: v.texto }); ctx.recarregar(); });
    comEditor(raiz, '[data-modelos]', async (v) => { await painel('pessoas', 'mudar_modelo', { pessoa_id: 'pepper', texto: v.texto }); ctx.recarregar(); });
    comConfirmacao(raiz, '[data-desligar]', async () => { await painel('pessoas', 'desligar', { pessoa_id: 'pepper' }); ctx.recarregar(); });
  },
};

const PJ5 = {
  ...P, titulo: 'Chaves',
  carregar: () => painel('chaves'),
  corpo: (d) => '<h2>Pepper</h2>' + lista(...(d.chaves || []).map((c) => item(esc(c.nome), { det: (c.ligada ? 'ligada' : 'desligada') + (c.det ? ' · ' + esc(c.det) : '') })))
    + editor('ed-chaves', (d.chaves || []).map((c) => `<label class="marca"><input type="checkbox" name="${esc(c.id)}"${c.ligada ? ' checked' : ''}> ${esc(c.nome)}</label>`).join(''))
    + acoes(botao('Mudar as chaves', { principal: true, attrs: ' data-editor="ed-chaves" data-chaves' }))
    + '<p class="pequeno">Uma chave muda a direção aos poucos. Um evento forte mexe na hora.</p>'
    + '<h2>Pelo Jean, agora</h2>' + lista(...(d.sentimentos || []).map((s) => item(esc(s.nome), { fim: `${s.valor} · ${esc(s.tendencia)}` })))
    + (d.humor ? `<p class="pequeno">Humor: ${esc(d.humor)}.</p>` : ''),
  depois(raiz, d, ctx) {
    comEditor(raiz, '[data-chaves]', async (v) => { await painel('chaves', 'mudar_chave', { chaves: v }); ctx.recarregar(); });
  },
};

const PJ6 = {
  ...P, titulo: 'Cúpula',
  carregar: () => painel('cupula'),
  corpo: (d) => [['Amigos vivos', d.amigos], ['Conhecidos distantes', d.conhecidos], ['Inspirações', d.inspiracoes]]
    .map(([t, l]) => `<h2>${t}</h2>` + ((l || []).length ? lista(...l.map((n) => item(esc(n)))) : '<p class="texto-2">Ninguém.</p>')).join('')
    + editor('ed-cupula', campo('Quem entra ou sai', 'cu', { area: true, nome: 'texto' }))
    + acoes(botao('Mudar a cúpula', { principal: true, attrs: ' data-editor="ed-cupula" data-cupula' })),
  depois(raiz, d, ctx) {
    comEditor(raiz, '[data-cupula]', async (v) => { await painel('cupula', 'mudar', { texto: v.texto }); ctx.recarregar(); });
  },
};

const PJ7 = {
  ...P, titulo: 'Carteira e conta',
  carregar: () => painel('carteira'),
  corpo(d) {
    const topo = numeros(['Conta', dolares(d.conta_usd, 0)], ['Carteira', dolares(d.carteira_usd, 0), d.variacao_mes != null ? porcento(d.variacao_mes) + ' no mês' : '']);
    if (!(d.posicoes || []).length) return topo + vazio('Ela ainda não investiu.', ' A reserva está parada na conta.');
    return topo + '<h2>Posições</h2>' + lista(...d.posicoes.map((p) => item(esc(p.nome), { det: esc(p.det), fim: porcento(p.variacao) })))
      + ((d.ordens || []).length ? '<h2>Ordens</h2>' + lista(...d.ordens.map((o) => item(esc(o.texto), { det: (o.motivo ? '“' + esc(o.motivo) + '” · ' : '') + data(o.data, true) }))) : '');
  },
};

const PJ9 = {
  ...P, titulo: 'Módulos',
  carregar: () => painel('modulos'),
  corpo: (d) => lista(...(d.modulos || []).map((m) => item(esc(m.nome), { det: esc(m.det) + (m.ligado ? '' : ' · desligado'),
    acao: m.entrega === 1 ? botao(m.ligado ? 'Desligar' : 'Ligar', { leve: true, attrs: ` data-modulo="${esc(m.id)}" data-ligado="${m.ligado ? 1 : 0}"` }) : '' }))),
  depois(raiz, d, ctx) {
    aoTocar(raiz, '[data-modulo]', async (b) => { await painel('modulos', b.dataset.ligado === '1' ? 'desligar' : 'ligar', { id: b.dataset.modulo }); ctx.recarregar(); });
  },
};

const PJ10 = {
  ...P, titulo: 'Pedidos de função',
  carregar: () => painel('pedidos'),
  corpo(d) {
    const l = d.pedidos || [];
    if (!l.length) return vazio('Nenhum pedido de função.');
    return lista(...l.map((p, i) => item(esc(p.titulo), { det: 'pedido pela Pepper · ' + ((p.estado === 'com_jean' || p.estado === 'com_o_jean') ? data(p.data, true) + ' · com o Jean' : 'novo'),
      acao: botao((p.estado === 'com_jean' || p.estado === 'com_o_jean') ? 'Pronto' : 'Levei ao revisor', { principal: i === 0, leve: i > 0,
        attrs: ` data-pedido="${esc(p.id)}" data-acao="${(p.estado === 'com_jean' || p.estado === 'com_o_jean') ? 'pronto' : 'levei_ao_revisor'}"` }) })));
  },
  depois(raiz, d, ctx) {
    aoTocar(raiz, '[data-pedido]', async (b) => { await painel('pedidos', b.dataset.acao, { id: b.dataset.pedido }); ctx.recarregar(); });
  },
};

const PJ12 = {
  ...P, titulo: 'Registros e falhas',
  carregar: () => painel('registros'),
  corpo: (d) => ((d.falhas || []).length
    ? '<h2>Falhas abertas</h2>' + lista(...d.falhas.map((f) => item(esc(f.texto), { det: esc(f.quando), cls: 'item--vencido' })))
    : '<div class="aviso aviso--certo">Nenhuma falha aberta.</div>')
    + '<h2>Registro de hoje</h2>' + ((d.registro || []).length
      ? lista(...d.registro.map((r) => item(esc(r.hora) + ' · ' + esc(r.texto), { det: esc(r.det || ''), fim: r.usd != null ? dolares(r.usd) : '' })))
      : '<p class="texto-2">Nada registrado hoje.</p>'),
};

const PJ13 = {
  ...P, titulo: 'Sistema',
  carregar: () => painel('sistema'),
  corpo: (d) => lista(...(d.servicos || []).map((s) => item(esc(s.nome), { det: esc(s.estado), cls: s.estado === 'fora' ? 'item--vencido' : '' })))
    + acoes(botao('Fazer backup agora', { principal: true, attrs: ' data-backup' })),
  depois(raiz, d, ctx) {
    aoTocar(raiz, '[data-backup]', async () => { await painel('sistema', 'fazer_backup_agora'); ctx.recarregar(); });
  },
};

export default { PJ0, PJ1, PJ2, PJ3, PJ4, PJ5, PJ6, PJ7, PJ9, PJ10, PJ12, PJ13 };
