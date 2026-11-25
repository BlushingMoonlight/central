// Central — modo de demonstração (?demo=1): respostas gravadas da API, com dados INVENTADOS, coerentes com o protótipo
// (o "hoje" é 23/11/2026; a troca do DARF; a Morgan na escola às 09:41 de Brasília). Serve para os testes
// (scripts/verificar_design.mjs e scripts/jornadas.mjs) e para ver o app sem servidor. Nada aqui é dado real.
//
// ?estado= muda o caso: normal, vazio (listas vazias), erro (sem conexão), carregando (nunca responde),
// salario (o salário do mês vence hoje, PE1) e sem_sessao (sem token: cai na entrada).
//
// O formato de cada resposta aqui é o que o app espera do servidor (docs/codigo/api.md, no central-sistema).

const H = (hhmm, dia = '2026-11-23') => { const [h, m] = hhmm.split(':').map(Number); return `${dia}T${String(h + 3).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`; };
const copia = (x) => JSON.parse(JSON.stringify(x));

const inicial = () => ({
  mensagens: [
    { id: 'm1', autor: 'pepper', tipo: 'msg', texto: 'bom dia', enviada_em: H('08:10'), lida_em: H('08:20') },
    { id: 'm2', autor: 'pepper', tipo: 'msg', texto: 'o darf vence hoje', enviada_em: H('08:11'), lida_em: H('08:20') },
    { id: 'm3', autor: 'pepper', tipo: 'msg', texto: 'paga até as 18h? senão eu fico chata', enviada_em: H('08:12'), lida_em: H('08:20') },
    { id: 's1', autor: 'central', tipo: 'sistema', texto: 'Tarefa criada em Finanças: pagar o DARF, vence hoje.', desfazer: true, enviada_em: H('08:12') },
    { id: 'm4', autor: 'jean', tipo: 'msg', texto: 'pago depois do almoço', enviada_em: H('08:30'), lida_em: H('08:31') },
    { id: 'm5', autor: 'pepper', tipo: 'msg', texto: 'ok', enviada_em: H('08:31'), lida_em: H('09:30') },
    { id: 'm6', autor: 'jean', tipo: 'msg', texto: 'o que você está fazendo?', enviada_em: H('09:38'), lida_em: H('09:39') },
    { id: 'm7', autor: 'pepper', tipo: 'msg', texto: 'levando a morgan na escola', enviada_em: H('09:40'), lida_em: H('10:02') },
    { id: 'm8', autor: 'pepper', tipo: 'msg', texto: 'trânsito parado. e vc?', enviada_em: H('09:41'), lida_em: H('10:02') },
    { id: 'm9', autor: 'pepper', tipo: 'audio', texto: 'a fila da escola não anda. vou chegar atrasada na reunião das dez', duracao: 14, audio_url: '',
      enviada_em: H('09:44'), lida_em: H('10:02') },
    { id: 'm10', autor: 'jean', tipo: 'msg', texto: 'paguei o darf', enviada_em: H('13:05'), lida_em: H('13:06') },
  ],
  proposta: { id: 'p1', titulo: 'Marcar o DARF como pago?', resumo: 'R$ 1.240,00, pago hoje.', valor: 1240,
    o_que: 'O DARF de R$ 1.240,00, que vencia hoje, fica como pago.', por_que: 'Você disse na conversa que pagou.',
    depois: 'A tarefa sai de “Precisa de você hoje” e fica em Feitas.' },
  visto_por_ultimo: H('13:06'),
  combinados: [{ id: 'c1', texto: 'Não falar mais da viagem de março', desde: '2026-11-10' }, { id: 'c2', texto: 'Lembrar da água às 15h', desde: '2026-11-02' }],
  precisa: [
    { tipo: 'tarefa', id: 't-darf', titulo: 'Pagar o DARF', area: 'Finanças', prazo: '2026-11-23', valor: 1240 },
    { tipo: 'tarefa', id: 't-dominio', titulo: 'Renovar o domínio do SaaS', area: 'Trabalho e SaaS', prazo: '2026-11-27' },
    { tipo: 'proposta', id: 'p2', titulo: 'pagar a internet', area: 'Casa', valor: 119.9 },
  ],
  areas: [['saas', 'Trabalho e SaaS', 5], ['saude', 'Saúde', 2], ['casa', 'Casa', 3], ['familia', 'Família', 1], ['financas', 'Finanças', 4],
    ['gatos', 'Gatos', 2], ['projetos', 'Projetos pessoais', 3]].map(([id, nome, abertas]) => ({ id, nome, abertas })),
  tarefas: {
    't-internet': { id: 't-internet', titulo: 'Pagar a internet', prazo: '2026-11-28', area_id: 'casa', area: 'Casa', origem: 'Conversa' },
    't-filtro': { id: 't-filtro', titulo: 'Trocar o filtro da torneira', prazo: '2026-12-02', area_id: 'casa', area: 'Casa',
      origem: 'Áudio do Jean, criada pela Pepper', notas: 'O modelo está na foto da caixa.',
      historico: [{ o_que: 'Criada', quando: '2026-11-20' }, { o_que: 'adiada uma vez', quando: '2026-11-21' }] },
    't-porta': { id: 't-porta', titulo: 'Consertar a porta do armário', prazo: null, area_id: 'casa', area: 'Casa', origem: 'criada pela Pepper' },
    't-darf': { id: 't-darf', titulo: 'Pagar o DARF', prazo: '2026-11-23', area_id: 'financas', area: 'Finanças', origem: 'Foto do Jean' },
    't-dominio': { id: 't-dominio', titulo: 'Renovar o domínio do SaaS', prazo: '2026-11-27', area_id: 'saas', area: 'Trabalho e SaaS', origem: 'Conversa' },
  },
  feitas: [{ id: 'f1', titulo: 'Pagar a luz', area: 'Casa', feita_em: '2026-11-21' },
    { id: 'f2', titulo: 'Mandar a nota ao contador', area: 'Trabalho e SaaS', feita_em: '2026-11-20' }],
  pedidos: [{ id: 'r1', titulo: 'Acompanhar a natação', data: '2026-11-23', estado: 'com_jean' }, { id: 'r2', titulo: 'Lembrar de beber água', estado: 'novo' }],
  salarioPago: false,
});
let S = inicial();

const vazioOu = (estado, cheio, vazio) => (estado === 'vazio' ? vazio : cheio);
const PEDIDO_AUMENTO = { id: 'p9', de: 'pessoa', modulo: 'salario', valor: 55000, titulo: 'Contrato novo: salário de R$ 55.000,00 por mês a partir de 01/12/2026',
  resumo: 'Hoje R$ 45.000,00.', o_que: 'Contrato novo: salário de R$ 55.000,00 por mês a partir de 01/12/2026 (hoje R$ 45.000,00).', por_que: 'Assumi as finanças da casa e os dois SaaS.' };
const CONFIRMAR_AUMENTO = { id: 'p10', de: 'jean', modulo: 'salario', valor: null, titulo: 'Aumento para a Pepper de 10% · pago por você', resumo: '' };

function mensagem(c, estado) {
  if (c.acao === 'listar') {
    if (estado === 'vazio') return { mensagens: [], proposta: null, visto_por_ultimo: null, escrevendo: false };
    // Lote 1 (DEC-128): o pedido de aumento dela (estado "aumento") e a ação do Jean esperando a confirmação ("confirmar").
    const prop = estado === 'aumento' ? PEDIDO_AUMENTO : estado === 'confirmar' ? CONFIRMAR_AUMENTO : S.proposta;
    return { mensagens: S.mensagens, proposta: S.propostaFeita ? null : prop, visto_por_ultimo: S.visto_por_ultimo, escrevendo: false };
  }
  if (c.acao === 'enviar') {
    const agora = new Date().toISOString();
    S.mensagens.push({ id: 'n' + S.mensagens.length, autor: 'jean', tipo: c.audio_base64 ? 'audio' : 'msg', texto: c.texto || '', duracao: c.duracao,
      enviada_em: S.mensagens.length ? H('13:07') : agora, lida_em: null });
    return {};
  }
  if (c.acao === 'desfazer') { S.mensagens = S.mensagens.filter((m) => m.id !== c.id); return {}; }
  return {};
}

const tarefasDaArea = (area) => Object.values(S.tarefas).filter((t) => t.area_id === area);

function vida(c, estado) {
  switch (c.acao) {
    case 'hoje': return { precisa: vazioOu(estado, S.precisa, []), areas: S.areas };
    case 'area': {
      const a = S.areas.find((x) => x.id === c.area) || { id: c.area, nome: 'Área' };
      const l = vazioOu(estado, tarefasDaArea(a.id), []);
      return { area: { id: a.id, nome: a.nome, notas: a.id === 'casa' ? 'O síndico atende de manhã.' : '' },
        com_prazo: l.filter((t) => t.prazo).sort((x, y) => x.prazo.localeCompare(y.prazo)), sem_prazo: l.filter((t) => !t.prazo) };
    }
    case 'tarefa': return { tarefa: S.tarefas[c.id] || S.tarefas['t-filtro'], areas: S.areas.map(({ id, nome }) => ({ id, nome })) };
    case 'feitas': return { tarefas: vazioOu(estado, S.feitas, []) };
    case 'anotacoes': return { anotacoes: vazioOu(estado, [{ id: 'a1', titulo: 'Viagem no fim do mês', data: '2026-11-20', texto: 'reorganizar os prazos daquela semana' }], []) };
    case 'feito': {
      const t = S.tarefas[c.id];
      S.precisa = S.precisa.filter((p) => p.id !== c.id);
      if (t) { S.feitas.unshift({ id: t.id, titulo: t.titulo, area: t.area, feita_em: '2026-11-23' }); delete S.tarefas[c.id]; }
      return {};
    }
    case 'adiar': case 'mudar': { const t = S.tarefas[c.id]; if (t) Object.assign(t, c.prazo ? { prazo: c.prazo } : {}, c.campos || {}); return {}; }
    case 'apagar': delete S.tarefas[c.id]; return {};
    default: return {};
  }
}

const COMPROMISSOS = { c1: { id: 'c1', o_que: 'Reunião com o contador', quando: H('14:00'), duracao_min: 60, onde: 'Por vídeo', com_quem: 'Contador', lembrete: '30 minutos antes' } };
const CONTATOS = [{ id: 'carla', nome: 'Carla', relacao: 'irmã', aniversario: '2026-11-24', notas: 'Gosta de livros de suspense. Ano passado: um vinho.' },
  { id: 'mae', nome: 'Mãe', relacao: '', aniversario: '2027-01-03' }, { id: 'pedro', nome: 'Pedro', relacao: 'amigo', aniversario: '2027-02-18' }];
function agenda(c, estado) {
  switch (c.acao) {
    case 'proximos': return { dias: vazioOu(estado, [
      { data: '2026-11-23', itens: [{ tipo: 'compromisso', id: 'c1', titulo: 'Reunião com o contador', hora: '14:00', det: 'Trabalho e SaaS' },
        { tipo: 'prazo', id: 't-darf', titulo: 'Prazo: pagar o DARF', det: 'Finanças', vencido: true }] },
      { data: '2026-11-24', itens: [{ tipo: 'aniversario', id: 'carla', titulo: 'Aniversário da Carla', det: 'irmã' }] },
      { data: '2026-11-27', itens: [{ tipo: 'renovacao', id: 'a1', titulo: 'Renovação: domínio do SaaS', valor: 59.9 }] },
      { data: '2026-12-01', itens: [{ tipo: 'fatura', id: 'k1', titulo: 'Fatura do cartão final 1234 fecha' }] }], []) };
    case 'compromisso': return { compromisso: COMPROMISSOS[c.id] || COMPROMISSOS.c1 };
    case 'aniversarios': return { contatos: vazioOu(estado, CONTATOS, []) };
    case 'contato': return { contato: CONTATOS.find((x) => x.id === c.id) || CONTATOS[0] };
    default: return {};
  }
}

const GASTOS = [
  { id: 'g1', titulo: 'Mercado', data: '2026-11-23', meio: 'cartão final 1234', uso: 'pessoal', valor: 312.4, categoria: 'Mercado', itens: '23 itens · lidos do QR da NFC-e' },
  { id: 'g2', titulo: 'Hospedagem do SaaS', data: '2026-11-20', meio: 'cartão final 1234', uso: 'saas', valor: 119.9, categoria: 'Infraestrutura' },
  { id: 'g3', titulo: 'Farmácia', data: '2026-11-18', meio: 'Pix', uso: 'pessoal', valor: 64.8, categoria: 'Saúde' }];
const ASSINATURAS = [
  { id: 'a1', titulo: 'Domínio do SaaS', periodicidade: 'anual', uso: 'saas', renova: '2026-11-27', valor: 59.9, aviso_dias: 7, meio: 'Cartão final 1234' },
  { id: 'a2', titulo: 'Hospedagem do SaaS', periodicidade: 'mensal', uso: 'saas', renova: '2026-12-20', valor: 119.9, aviso_dias: 7, meio: 'Cartão final 1234' },
  { id: 'a3', titulo: 'Música', periodicidade: 'mensal', uso: 'pessoal', renova: '2026-12-03', valor: 21.9, aviso_dias: 3, meio: 'Cartão final 1234' }];
function financas(c, estado) {
  const v = (cheio, vazio) => vazioOu(estado, cheio, vazio);
  switch (c.acao) {
    case 'mes': return { mes: '2026-11', assinaturas_mes: v(389.7, null), pessoal: v(3812.4, 0), saas: v(1146, 0), vence: v([
      { tipo: 'tarefa', id: 't-darf', titulo: 'DARF', data: '2026-11-23', valor: 1240 },
      { tipo: 'assinatura', id: 'a1', titulo: 'Domínio do SaaS', det: 'renova', data: '2026-11-27', valor: 59.9 },
      { tipo: 'parcela', id: 'pa2', titulo: 'Notebook, parcela 3 de 10', data: '2026-12-01', valor: 420 }], []) };
    case 'gastos': return { gastos: v(GASTOS.filter((g) => !c.uso || g.uso === c.uso), []) };
    case 'gasto': return { gasto: GASTOS.find((g) => g.id === c.id) || GASTOS[0] };
    case 'assinaturas': return { pessoal_mes: 129.8, saas_mes: 259.9, total_ano: 4676.4, assinaturas: v(ASSINATURAS, []) };
    case 'assinatura': return { assinatura: ASSINATURAS.find((a) => a.id === c.id) || ASSINATURAS[1] };
    case 'parcelas': return { parcelas: v([{ id: 'pa1', titulo: 'Geladeira', faltam: 5, total: 12, valor: 310 }, { id: 'pa2', titulo: 'Notebook', faltam: 8, total: 10, valor: 420 }], []) };
    case 'dividas': return v({ devo: [{ id: 'd1', quem: 'Pedro', prazo: '2026-11-30', valor: 200 }], devem: [{ id: 'd2', quem: 'Lucas', prazo: null, valor: 150 }] }, { devo: [], devem: [] });
    case 'meios': return { meios: v([{ id: 'k0', nome: 'Pix' }, { id: 'k1', nome: 'Cartão final 1234', det: 'fecha dia 1 · vence dia 8' },
      { id: 'k2', nome: 'Cartão virtual final 9876', det: 'uso único · usado 15 de nov' }], []) };
    case 'desejos': return { desejos: v([{ id: 'w1', titulo: 'Cadeira de escritório', prioridade: 'alta', valor: 1900 }, { id: 'w2', titulo: 'Fone sem fio', prioridade: 'normal', valor: 600 }], []) };
    case 'meses': return { meses: v([{ mes: '2026-10', pessoal: 3630.1, saas: 1273 }, { mes: '2026-09', pessoal: 3402.55, saas: 1146 }], []) };
    default: return {};
  }
}

function pessoa(c, estado) {
  const vence = estado === 'salario' && !S.salarioPago;
  switch (c.acao) {
    case 'resumo': return { nome: 'Pepper', cargo: 'Chief of staff', desde: '2026-11-23',
      pendente: vence ? [{ tipo: 'salario', titulo: 'Salário de novembro', det: 'vence hoje', valor: 12000, mes: '2026-11' }] : [],
      propostas: estado === 'aumento' && !S.propostaFeita ? [PEDIDO_AUMENTO] : [] };
    case 'contrato': return { extras: S.extras || [], propostas: estado === 'aumento' && !S.propostaFeita ? [PEDIDO_AUMENTO] : [], contrato: { salario: S.salario || 45000, dia: 5, cargo: 'Chief of staff', moeda: 'Em reais; entra em dólar pelo câmbio do dia 5' },
      vence: S.salarioPago ? [] : [{ titulo: 'Salário de novembro (8 dias)', det: '8 dias de R$ 45.000,00', data: vence ? '2026-11-23' : '2026-12-05', valor: 12000, mes: '2026-11' }],
      holerites: [], primeiro_holerite: '2026-12-05' };
    case 'pagar_salario': S.salarioPago = true; return {};
    case 'mudar_salario': case 'dar_aumento': S.salario = c.valor || Math.round(45000 * (1 + (Number(c.percentual) || 0) / 100)); return {};
    case 'bonus': case 'adiantamento': S.extras = [{ tipo: c.acao, valor: c.valor, motivo: c.motivo || '', criado_em: '2026-11-24' }, ...(S.extras || [])]; return {};
    default: return {};
  }
}

function painelLer(tela, estado) {
  const v = (cheio, vazio) => vazioOu(estado, cheio, vazio);
  switch (tela) {
    case 'hoje': return { falhas_abertas: 0, ia_hoje_usd: 0.84, ia_mes_usd: 14.2, teto_mes_usd: 60,
      pedidos: v([{ titulo: 'Acompanhar a natação', det: '1 novo' }], []), mundo: { estado: 'Rodando', ultimo_ciclo: '13:10' }, backup: 'hoje, 03:00' };
    case 'custos': return { teto_mes_usd: 60, teto_motor_dia_usd: 1, camadas: [
      { nome: 'Mente', det: 'modelo principal', usd: 0.21 }, { nome: 'Resposta', det: 'modelo principal', usd: 0.17 }, { nome: 'Crítica', det: 'modelo menor', usd: 0.03 },
      { nome: 'Motor', det: 'modelo menor · teto US$ 1,00 por dia', usd: 0.38 }, { nome: 'Verificador', det: 'modelo menor', usd: 0.05 }],
    mes: [{ pessoa: 'Pepper', teto_usd: 60, usd: 14.2 }] };
    case 'mundo': return { estado: 'rodando', pausado: false, ritmo_min: 15, ritmo_max: 240, teto_motor_dia_usd: 1, motor_hoje_usd: 0.38,
      ciclos: v([{ hora: '13:10', eventos: 4, usd: 0.02 }, { hora: '12:40', eventos: 2, usd: 0.01 }], []) };
    case 'canone': return { eventos: v([
      { id: 'e1', hora: '09:41', texto: 'no carro, levando a Morgan à escola', origem: 'conversa', estado: 'aceito' },
      { id: 'e2', hora: '07:10', texto: 'acordou, café, chuva fina', origem: 'motor', estado: 'aceito' },
      { id: 'e3', hora: '07:05', texto: '“estava em Boston”', origem: 'conversa', estado: 'recusado', motivo: 'estava em casa' }], []) };
    case 'pessoas': return { pessoas: [{ nome: 'Pepper', estado: 'ativa', teto_usd: 60 }],
      modelos: [['Mente', 'principal'], ['Resposta', 'principal'], ['Crítica', 'menor'], ['Motor', 'menor'], ['Verificador', 'menor']].map(([camada, modelo]) => ({ camada, modelo })),
      permissoes: [{ caminho: 'vida/', acesso: 'lê e grava' }] };
    case 'chaves': return { chaves: [{ id: 'paixao', nome: 'Paixão', ligada: true, det: 'pode surgir sozinha' }, { id: 'romance', nome: 'Romance entre agentes', ligada: false },
      { id: 'demissao', nome: 'Demissão', ligada: false, det: 'ela pode ameaçar, mas não sai' }, { id: 'dor', nome: 'Dor grave', ligada: false }],
    sentimentos: [['Afeto', 12, 'subindo'], ['Confiança', 18, 'subindo'], ['Admiração', 15, 'estável'], ['Atração', 6, 'subindo']].map(([nome, valor, tendencia]) => ({ nome, valor, tendencia })),
    humor: 'um pouco irritada (trânsito)' };
    case 'cupula': return { amigos: ['Hermione Granger', 'Leia Organa', 'Mary Poppins'], conhecidos: ['Ruth Porat', 'Sheryl Sandberg', 'Angela Merkel', 'Elon Musk'],
      inspiracoes: ['Peter Drucker', 'Ada Lovelace', 'Jesus (visão gnóstica)'] };
    case 'carteira': return { conta_usd: 311240, carteira_usd: v(92880, 0), variacao_mes: v(1.2, null), posicoes: v([
      { nome: 'Fundo de índice dos EUA', det: '120 cotas · preço médio US$ 512', variacao: 2.1 }, { nome: 'Banco brasileiro', det: '800 ações · preço médio R$ 31,40', variacao: -1.8 }], []),
    ordens: [{ texto: 'Vendeu metade do banco', motivo: 'não gostei do que li sobre juros', data: '2026-11-21' }] };
    case 'modulos': return { modulos: [{ id: 'tarefas', nome: 'Tarefas', det: 'vida real · entrega 1', entrega: 1, ligado: true },
      { id: 'investimentos', nome: 'Investimentos', det: 'mundo · entrega 1 · US$ 0,90 no mês', entrega: 1, ligado: true },
      { id: 'gatos', nome: 'Gatos', det: 'vida real · entrega 1', entrega: 1, ligado: true }] };
    case 'pedidos': return { pedidos: v(S.pedidos, []) };
    case 'registros': return { falhas: [], registro: v([{ hora: '13:05', texto: 'conversa', det: 'Pepper', usd: 0.01 }, { hora: '13:10', texto: 'ciclo do motor', usd: 0.02 }], []) };
    case 'sistema': return { servicos: [['Servidor', 'no ar'], ['OpenAI', 'no ar'], ['Cotações (Yahoo Finance)', 'no ar'], ['Notícias (RSS)', 'no ar'], ['Clima e câmbio', 'no ar'],
      ['Relógio do trabalho', 'último ciclo 13:11'], ['Relógio da vida', 'último ciclo 13:10'], ['Backup', 'hoje, 03:00']].map(([nome, e]) => ({ nome, estado: e })) };
    default: return {};
  }
}

function painel(tela, c, estado) {
  if (c.acao === 'ler') return painelLer(tela, estado);
  // O ciclo e a exportação (DEC-141), com dados inventados.
  if (tela === 'mundo' && c.acao === 'ciclo') {
    const mes = (ano, m) => { const n = new Date(Date.UTC(ano, m, 0)).getUTCDate(); return { mes: `${ano}-${String(m).padStart(2, '0')}`, dias: Array.from({ length: n }, (_, i) => {
      const d = `${ano}-${String(m).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`; const k = (Date.parse(d) / 86400000 - Date.parse('2026-11-12') / 86400000 + 2900) % 29;
      return { d, fase: k < 5 ? 'menstruacao' : k >= 10 && k <= 16 ? 'fertil' : k > 16 ? 'lutea' : 'folicular' }; }) }; };
    return { hoje: '2026-11-23', mulheres: [{ quem: 'pessoa:pepper', nome: 'Pepper', hoje: { fase: 'fertil', fase_nome: 'fértil', dia: 12, duracao: 29, sinais: ['com energia boa'], proxima: '2026-12-11' },
      meses: [mes(2026, 11), mes(2026, 12), mes(2027, 1), mes(2027, 2)] }, { quem: 'personagem:Morgan', nome: 'Morgan', hoje: null, meses: [] }] };
  }
  if (tela === 'registros' && c.acao === 'exportar') return { nome_arquivo: `conversa-${c.de}.md`, texto: '# Conversa do Jean com a Pepper\n\n**Jean** (09:00 / 07:00): bom dia\n' };
  if (tela === 'pedidos' && c.acao === 'pronto') S.pedidos = S.pedidos.filter((p) => p.id !== c.id);
  if (tela === 'pedidos' && c.acao === 'levei_ao_revisor') S.pedidos.forEach((p) => { if (p.id === c.id) Object.assign(p, { estado: 'com_jean', data: '2026-11-23' }); });
  return {};
}

function entradaDemo(caminho, c, estado) {
  if (estado === 'erro') {
    if (caminho === 'entrar') return { ok: false, erro: 'E-mail ou senha errados. Depois de 5 tentativas, a entrada fica bloqueada por 15 minutos.' };
    return { ok: false, erro: c.etapa === 'codigo' ? 'Código errado ou vencido.' : 'Este e-mail não tem conta na Central.' };
  }
  if (caminho === 'entrar') return c.codigo || estado !== 'codigo' ? { ok: true, token: 'demo' } : { ok: true, precisa_codigo: true };
  return { ok: true, ...(c.etapa === 'senha' ? { token: 'demo' } : {}) };
}

export async function responder(caminho, corpo, estado) {
  if (estado === 'carregando') return new Promise(() => {});
  await new Promise((ok) => setTimeout(ok, 30));
  if (['primeiro-acesso', 'entrar', 'esqueci'].includes(caminho)) return entradaDemo(caminho, corpo, estado);
  if (estado === 'erro') return 'rede';
  const c = copia(corpo);
  let r;
  if (caminho === 'mensagem') r = mensagem(c, estado);
  else if (caminho === 'proposta') { S.proposta = null; S.propostaFeita = true; if (c.acao === 'aceitar') S.precisa = S.precisa.filter((p) => p.id !== 't-darf'); r = {}; }
  else if (caminho === 'buscar') {
    r = { resultados: /dentista/i.test(c.q) ? [{ origem: 'Conversa', trecho: '“a consulta do dentista ficou para o dia 4”', data: '2026-11-12' },
      { origem: 'Agenda', trecho: 'Dentista: limpeza', data: '2026-12-04', ref: { tipo: 'compromisso', id: 'c1' } },
      { origem: 'Vida · Saúde · feita', trecho: 'Marcar o dentista da família', ref: { tipo: 'tarefa', id: 't-filtro' } }] : [] };
  } else if (caminho === 'combinados') {
    if (c.acao === 'desfazer') S.combinados = S.combinados.filter((x) => x.id !== c.id);
    r = { combinados: vazioOu(estado, S.combinados, []) };
  } else if (caminho === 'captura') r = {};
  else if (caminho === 'gatos') {
    const G = [{ id: 'gatos/mingau', nome: 'Mingau', nascimento: '2021-03-14', vacina_proxima: '2027-01-10', racao: 'ração de filhote', racao_acaba: '2026-12-05', veterinario: 'Dra. Paula, clínica do bairro', historico: [] }];
    r = c.acao === 'gato' ? { gato: G[0] } : c.acao === 'gatos' ? { gatos: vazioOu(estado, G, []) } : {};
  } else if (caminho === 'vida') r = vida(c, estado);
  else if (caminho === 'agenda') r = agenda(c, estado);
  else if (caminho === 'financas') r = financas(c, estado);
  else if (caminho === 'pessoa') r = pessoa(c, estado);
  else if (caminho === 'aparelho') {
    r = c.acao === 'chave_push' ? { chave_publica: '' } : { mostrar_texto: false, aparelhos: [
      { id: 'x1', nome: 'iPhone', este: true, lembrado_ate: '2027-02-21' }, { id: 'x2', nome: 'iPad', ultimo_uso: '2026-11-22' }] };
  } else if (caminho.startsWith('painel/')) r = painel(caminho.slice(7), c, estado);
  else r = { ok: false, erro: 'Não deu para carregar.' };
  return { ok: true, ...copia(r) };
}

export function zerar() { S = inicial(); }
