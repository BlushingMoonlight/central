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
    // O WhatsApp e o mundo real (DEC-144), com dados inventados.
    case 'whatsapp': return { tem_evolution: true, numeros: [{ pessoa_id: 'pepper', nome: 'Pepper', numero: '5541900000000', estado: 'conectado', dias: 12 }, { pessoa_id: 'hermione', nome: 'Hermione', numero: null, estado: 'sem_numero', dias: null }],
      funil: v([{ id: 2, o_que: 'padarias', cidade: 'Cidade Exemplo', na_fila: 4, contatados: 6, responderam: 3, interessados: 1, fechados: 0 }], []),
      fios: v([{ id: 7, com: 'Marta', relacao: 'mãe', tipo: 'recado', objetivo: 'avisar que ele chega amanhã', estado: 'respondeu', resumo: 'vai fazer almoço quando ele chegar' },
        { id: 12, com: 'Serralheria Exemplo', relacao: 'fornecedor', tipo: 'orcamento', objetivo: 'conserto do portão', estado: 'respondeu', resumo: 'R$ 150, amanhã' }], []) };
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
  if (tela === 'whatsapp' && c.acao === 'fio') return { conversa: [{ autor: 'pessoa', texto: 'oi, aqui é a Virginia, trabalho com o Jean. ele chega amanhã!', saiu: true }, { autor: 'terceiro', texto: 'que bom! vou fazer almoço', saiu: true }] };
  if (tela === 'whatsapp' && ['conectar', 'trocar', 'qr'].includes(c.acao)) return { pessoa_id: c.pessoa_id, estado: 'esperando_qr', qr: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' };
  if (tela === 'whatsapp') return {};
  if (tela === 'sistema' && c.acao === 'whatsapp') return { canal: c.canal || 'whatsapp', estado: 'conectado', url: c.url || 'https://evolution.exemplo.com', numero: c.numero || '5541900000000', instancia: 'pepper',
    segredo: '0a1b2c3d4e5f', webhook: 'https://<o endereço do n8n>/webhook/central/whatsapp' };
  if (tela === 'mundo' && c.acao === 'variedade') return { assuntos: 11, assuntos_antes: 13, repetidas: 2, arcos: 2, novidade: false };
  if (tela === 'registros' && c.acao === 'notas') return { historico: [{ em: '2026-11-23T20:00:00Z', de: '2026-11-22', ate: '2026-11-22', media: 6.4, rodada: 'antes' }] };
  if (tela === 'registros' && c.acao === 'avaliar') return { media: 7.3, pior_trecho: '"já te respondo" (soou como atendente)', notas: { memoria: 7.7, consistencia: 8, limite_do_conhecimento: 8.3, emocao: 6.7, iniciativa: 7, discordancia: 6 },
    historico: [] };
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

// O jogo (JG) com a casa de exemplo: a cada 25 s ela muda de atividade, para ver ela andar até o objeto. As luzes da sala
// acendem à noite, como no servidor (o 68 decide de verdade).
const MESA_MORGAN = { onde: 'casa', visivel: true, objeto: 'mesa-jantar', pose: 'sentada', x: 11.4, y: 2.6 };
const ATIVIDADES = [
  { atividade: 'lendo no sofá', objeto: 'sofa', pose: 'sentada', balao: 'livro', humor: 'contente', celular: 'perto',
    morgan: { onde: 'casa', visivel: true, objeto: 'tapete-sala', pose: 'sentada', balao: 'brinquedo', atividade: 'brincando', x: 3.5, y: 6.4 } },
  { atividade: 'cozinhando o jantar', objeto: 'fogao', pose: 'parada', balao: 'panela', humor: 'contente', celular: 'perto',
    sentidos: { cheiros: ['alho', 'cebola'], sons: ['a panela chiando'], fumaca: true, vapor: false, panela: { receita: 'Macarrão ao alho', ingredientes: ['macarrão', 'alho'] } },
    morgan: { ...MESA_MORGAN, balao: 'livro', atividade: 'fazendo a lição' } },
  { atividade: 'trabalhando no notebook', objeto: 'mesa-trabalho', pose: 'sentada', balao: 'notebook', humor: 'concentrada', celular: 'mao', morgan: { onde: 'escola', visivel: false } },
  { atividade: 'vendo TV com uma amiga', objeto: 'sofa', pose: 'sentada', balao: 'tv', humor: 'contente', celular: 'perto', morgan: { onde: 'escola', visivel: false },
    visitas: [{ nome: 'Amiga', objeto: 'pufe', x: 5.75, y: 7.2, pose: 'sentada' }], tv: { ligada: true, canal: 3, volume: 4, programa: 'Fórmula 1' } },
  { atividade: 'jantando', objeto: 'mesa-jantar', pose: 'sentada', balao: 'comida', humor: 'contente', celular: 'perto', prato: { nome: 'Macarrão ao alho', porcoes: 2, onde: 'mesa-jantar' },
    morgan: { ...MESA_MORGAN, balao: 'comida', atividade: 'comendo' } },
  { atividade: 'no banho', privado: true, balao: 'porta', humor: 'calma', celular: 'perto', sentidos: { cheiros: [], sons: ['o chuveiro'], fumaca: false, vapor: true },
    morgan: { onde: 'casa', visivel: true, objeto: 'pufe', pose: 'sentada', balao: 'tv', atividade: 'vendo desenho', x: 5.75, y: 7.2 }, tv: { ligada: true, canal: 5, volume: 3, programa: 'Desenho' } },
  { atividade: 'lendo na poltrona', objeto: 'poltrona', pose: 'sentada', balao: 'livro', humor: 'calma', celular: 'perto', morgan: { onde: 'casa', visivel: false, atividade: 'dormindo no quarto dela' } },
  { atividade: 'dormindo', objeto: 'cama', pose: 'deitada', balao: 'zzz', humor: 'calma', celular: 'criado', morgan: { onde: 'casa', visivel: false, atividade: 'dormindo no quarto dela' } },
];
let mapaDemo = null; let jogoEstado = null;
// Uma casa inventada para o Jean na demonstração (a de verdade fica só no banco privado, DEC-176).
let CASA_JEAN_DEMO = null; // jogo/mapas/casa-exemplo.json
const JEAN_DEMO = { aparencia: { pele: 1, cabelo: 'curto', cor_cabelo: 'castanho', barba: 'curta', camisa: 'azul', calca: 'jeans', sapato: 'branco' }, mapa_id: 'casa-jean', x: 2.5, y: 3.5, andar: 0,
  viagem: null, voando: false, fora: null, esperando: false, visto: false, config: { camera: 'pepper', botoes: false, apresentacao: true } };
// A demonstração responde às ações do jogo sem servidor, só para ver os menus funcionarem (o 68 decide de verdade).
async function jogoDemo(c) {
  if (!mapaDemo) mapaDemo = await (await fetch('jogo/mapas/casa-pepper.json')).json();
  if (!CASA_JEAN_DEMO) CASA_JEAN_DEMO = await (await fetch('jogo/mapas/casa-exemplo.json')).json();
  if (!jogoEstado) { const acesas = ['abajur-chao', 'luzinhas-sala', 'lava', 'aquario', 'pendente', 'abajur-quarto', 'monitor', 'luz-armario', 'poste-1', 'poste-2', 'poste-3'];
    jogoEstado = { itens: Object.fromEntries(mapaDemo.itens.filter((i) => i.luz).map((i) => [i.id, { ligada: acesas.includes(i.id), brilho: 85, cor: i.luz.cor }])),
      gato: { nome: 'Biscoito', acao: 'dormindo', saude: 96, idade: 4, necessidades: { fome: 70, sede: 75, sono: 80, diversao: 50, carinho: 60, higiene: 90, bexiga: 80, intestino: 85 } },
      casa: { louca: 2, lixo: 70, roupa: 3, arrumada: false, ambiente: 68, estoque: { petisco: 5 }, guardados: [] } };
    Object.assign(jogoEstado.itens, { 'caixa-areia': { sujeira: 65, quantidade: 60 }, 'potes-gato': { racao: 40, agua: 70 }, tv: { ligada: false, canal: 4, volume: 4 },
      geladeira: { inventario: { compartimentos: [{ nome: 'Prateleira de cima', capacidade: 8, itens: { Leite: 2, Ovos: 6 } }, { nome: 'Prateleira do meio', capacidade: 8, itens: { Frutas: 4 } }] } } }); }
  const E = jogoEstado; let reacao = null; const J = JEAN_DEMO;
  if (c.acao === 'jean') { const v = c.valor || {};
    if (c.op === 'andar') { if (c.mapa !== J.mapa_id) return { ok: false, erro: 'Você não está nesse mapa.' }; Object.assign(J, { x: v.x, y: v.y, andar: v.andar || 0 }); }
    else if (c.op === 'config') Object.assign(J.config, v); else if (c.op === 'aparencia') Object.assign(J.aparencia, v);
    else if (c.op === 'viajar') { if (v.para === J.mapa_id) return { ok: false, erro: 'Você já está aí.' }; J.mapa_id = v.para; J.x = null; } }
  if (c.acao === 'construir') { const v = c.valor || {}; const m = c.mapa === 'casa-jean' ? CASA_JEAN_DEMO : mapaDemo; if (v.base !== m.versao) return { ok: false, erro: 'O mapa mudou enquanto você construía. Abra o construtor de novo.' };
    if (!v.mapa.aberturas.some((a) => a.saida)) return { ok: false, erro: 'A casa precisa de uma porta para a rua (marque uma porta como saída).' };
    Object.assign(m, JSON.parse(JSON.stringify(v.mapa)), { versao: m.versao + 1 }); }
  const naJean = c.mapa === 'casa-jean'; if (J.x === null) { const pt = (J.mapa_id === 'casa-jean' ? CASA_JEAN_DEMO : mapaDemo).pontos.porta; J.x = pt.x; J.y = pt.y; }
  if (c.acao === 'item') { const e = E.itens[c.item] = E.itens[c.item] || {};
    if (c.op === 'ligar' || c.op === 'desligar') { e.ligada = c.op === 'ligar'; reacao = 'ue'; } else if (c.op === 'brilho') e.brilho = c.valor; else if (c.op === 'cor') e.cor = c.valor;
    else if (c.op === 'canal') { e.canal = ((e.canal || 1) % 9) + 1; e.ligada = true; } else if (c.op === 'volume') e.volume = c.valor; else if (c.op === 'mudo') e.mudo = !e.mudo;
    else if (c.op === 'limpar') e.sujeira = 0; else if (c.op === 'encher') { e.racao = 100; e.agua = 100; } else if (c.op === 'assistir_junto') return { ok: false, erro: 'Para assistir junto, você precisa estar lá, perto dela, com ela no sofá.' };
    if (c.item === 'gato') { E.gato.acao = 'ronronando'; E.gato.necessidades.carinho = 95; } }
  if (c.acao === 'mover' && c.op === 'soltar') { const it = mapaDemo.itens.find((i) => i.id === c.item); if (it) { it.x = c.valor.x; it.y = c.valor.y; mapaDemo.versao = (mapaDemo.versao || 1) + 1; } }
  const { tv: tvDaVez, ...pepper } = ATIVIDADES[Math.floor(Date.now() / 25000) % ATIVIDADES.length];
  const itensDaVez = tvDaVez ? { ...E.itens, tv: { ...E.itens.tv, ...tvDaVez } } : E.itens;
  return { mapa_id: naJean ? 'casa-jean' : 'casa-pepper', mapa: naJean ? CASA_JEAN_DEMO : mapaDemo, pepper: { ...pepper, necessidades: { fome: 62, energia: 48, higiene: 80, bexiga: 70, diversao: 55, social: 66, conforto: 74, ambiente: 68, saude: 92, estresse: 30 } },
    itens: naJean ? { 'abajur-chao': { ligada: true, brilho: 85 } } : itensDaVez, gato: E.gato, casa: E.casa, clima: 'chuva', reacao, avisos: [], jean: { ...J }, agora: new Date().toISOString() };
}
// O celular do jogo na demonstração (o 69 de verdade lê o banco).
// A parte I (DEC-199 a DEC-202): o papel (?papel=jogador faz o jogador comum), o celular dela, a ficha, a exportação e o reportar.
const AGORA_DEMO = '2026-11-23T15:00:00Z';
const papelDemo = () => (new URLSearchParams(location.search).get('papel') === 'jogador' ? 'jogador' : 'administrador');
const FICHAS_DEMO = {
  pepper: { quem: 'pepper', nome: 'Pepper', idade: 36, relacao: 'trabalha para o Jean (Chief of staff)', agora: { faz: 'lendo no sofá', onde: 'em casa (sala)', desde: '2026-11-23T14:35:00Z' },
    humor: 'contente', barras: { fome: 62, energia: 48, social: 66, estresse: 30 }, trabalho: 'Chief of staff', mora: 'Brooklyn Heights, Nova York', bens: [{ o_que: 'Na conta (USD)', valor: 5230.5, moeda: 'USD' }],
    momentos: [{ texto: 'Leu no sofá com o gato.', em: '2026-11-23T13:00:00Z' }],
    completa: { personalidade: [{ traco: 'abertura', valor: 7 }, { traco: 'amabilidade', valor: 8 }], lacos: [{ com: 'Jean', tipo: 'chefe', afeto: 62 }, { com: 'Morgan', tipo: 'familia', afeto: 90 }], pensa: 'Dia bom no trabalho.' } },
  morgan: { quem: 'morgan', nome: 'Morgan', idade: 7, relacao: 'filha da Pepper', agora: { faz: 'brincando', onde: 'em casa', desde: null }, humor: null, barras: null, trabalho: 'a escola',
    mora: 'com a Pepper, em Brooklyn Heights', bens: [], momentos: [{ texto: 'Desenhou um gato na escola.', em: '2026-11-23T12:00:00Z' }], completa: { personalidade: [], historia: 'Adora desenhar.', lacos: [{ com: 'Pepper', tipo: 'familia', afeto: null }], pensa: null } },
  jean: { quem: 'jean', nome: 'Jean', idade: null, relacao: 'você · o chefe da Pepper', agora: { faz: 'em casa, em Canoinhas', onde: 'em casa, em Canoinhas', desde: null }, humor: null, barras: null,
    trabalho: '', mora: 'Canoinhas, Santa Catarina', bens: [], momentos: [], completa: { personalidade: [], lacos: [{ com: 'Pepper', tipo: 'o que ela sente por você', afeto: 62 }], pensa: null } },
};
function celularDemo(c) {
  if (c.acao === 'ficha') { const f = FICHAS_DEMO[String(c.quem || '').toLowerCase()]; return f ? { agora: AGORA_DEMO, ficha: f } : { ok: false, erro: 'Não achei essa pessoa.' }; }
  if (c.acao === 'dela') return { agora: AGORA_DEMO, dela: { despertador: { hora: '07:00', tocou: true }, compras: ['Massa', 'Leite'],
    conversas: [{ com: 'Morgan', mensagens: [{ autor: 'Pepper', texto: 'filha, já escovou os dentes?', em: '2026-11-23T01:00:00Z' }, { autor: 'Morgan', texto: 'jáaa', em: '2026-11-23T01:01:00Z' }], momentos: [] },
      { com: 'Amiga de exemplo', mensagens: [], momentos: [{ texto: 'Almoçaram juntas.', em: '2026-11-22T17:00:00Z' }] }],
    whatsapp: [{ autor: 'Jean', texto: 'bom dia!', em: '2026-11-23T11:00:00Z' }, { autor: 'Pepper', texto: 'bom dia, chefe', em: '2026-11-23T11:01:00Z' }],
    diario: [{ dia: '2026-11-22', texto: 'Dia bom no trabalho.' }] } };
  if (c.acao === 'exportar') return { nome_arquivo: `conversa-${c.de}-a-${c.ate}.md`, mensagens: 2, texto: '# Conversa com a Pepper\n\n## 23/11/2026\n\n**Jean** (08:00): bom dia!\n**Pepper** (08:01): bom dia, chefe\n' };
  if (c.acao === 'reportar') return { bug: 7 };
  if (c.acao === 'localizacao') return { local: { ligado: c.op !== 'desligar', lugar: 'casa', segredo: '0a1b2c3d4e5f', lugares: [{ nome: 'casa', raio: 150 }], eventos: [] } };
  return { agora: AGORA_DEMO, papel: papelDemo(), admin: papelDemo() === 'administrador', versao: { minima: 0, api: 1, atualize: false },
    cabecalho: { pepper: { atividade: 'lendo no sofá', humor: 'contente' }, jean: { onde: 'em casa, em Canoinhas' }, clima: { temperatura: 8, condicao: 'Chuva fraca' } },
    status: { emocao: { base: 'Contente', frase: 'Contente, cansada mas feliz' }, motivos: [{ texto: 'O Jean mandou mensagem hoje', pontos: 2 }, { texto: 'Casa aconchegante', pontos: 1 }, { texto: 'Dia puxado', pontos: -1 }],
      barras: { fome: 62, energia: 48, higiene: 80, bexiga: 70, diversao: 55, social: 66, conforto: 74, ambiente: 68, saude: 92, estresse: 30 }, saudade: 40, ciclo: { dia: 9, duracao: 28, fase: 'folicular' } },
    pessoas: [{ nome: 'Jean', relacao: 'chefe', onde: 'em casa, em Canoinhas', afeto: 62 }, { nome: 'Morgan', relacao: 'familia', onde: '', afeto: 90 }, { nome: 'Amiga de exemplo', relacao: 'amizade', onde: '', afeto: 55 }],
    mapa: { pepper: { cidade: 'Nova York', bairro: 'Brooklyn Heights', onde: 'em casa (sala)' }, jean: { cidade: 'Canoinhas', onde: 'em casa, em Canoinhas', viagem: null }, viagens: [] },
    casa: { contas: [{ o_que: 'Aluguel', valor: 2400, moeda: 'USD' }], bichos: [{ nome: 'Biscoito', vivo: true, idade: 4, saude: 96 }] },
    bolsa: { guardados: { Leite: 1 }, guardados_itens: [], saldos: [{ moeda: 'USD', saldo: 5230.5 }] },
    linha: [{ tipo: 'diario', texto: 'Dia bom no trabalho.', em: '2026-11-24' }, { tipo: 'momento', texto: 'Leu no sofá com o gato.', em: '2026-11-25T10:00:00Z' }],
    config: { local: { ligado: true, lugar: 'casa', segredo: '0a1b2c3d4e5f', lugares: [{ nome: 'casa', raio: 150 }], eventos: [] }, jean: JEAN_DEMO.config } };
}

function bastidoresDemo(c, estado) {
  if (c.acao !== 'ler') return c.acao === 'por_que' ? { mensagens: [{ id: 1, autor: 'pepper', texto: 'tô na sala', em: '2026-11-23T14:00:00Z', apagada: false }], ia: [{ camada: 'conversa', modelo: 'leve', fim: 'stop', em: '2026-11-23T14:00:00Z' }], registro: [] } : {};
  const v = (x) => vazioOu(estado, x, []);
  return { funil: { abriu: '2026-11-01T12:00:00Z', criou_o_personagem: '2026-11-01T12:05:00Z', falou_com_ela: '2026-11-01T12:10:00Z', mexeu_na_casa: '2026-11-02T20:00:00Z' },
    seguranca: v([{ id: 1, tipo: 'pedido_de_dado', nivel: 'medio', detalhe: 'alguém pediu o endereço do Jean', em: '2026-11-22T18:00:00Z' }]),
    falhas_conversa: v([{ tipo: 'resposta_vazia', vezes: 1, ultima: '2026-11-22T22:00:00Z' }]), chaves: {},
    travamentos: v([{ pessoa_id: 'pepper', motivo: 'sem caminho até o fogão', acao: 'cozinhar', em: '2026-11-22T19:00:00Z' }]),
    observacoes: v([{ o_que: 'a TV ligou sozinha', onde: 'sala', importancia: 8, em: '2026-11-22T20:10:00Z' }]),
    interesses: v([{ id: 1, assunto: 'Fórmula 1', de_onde: 'o Jean disse que acompanha', sabe: 3 }]),
    metas: [{ respondidas_em_60s_pct: 99.2, mensagens_perdidas: 0, lembretes_perdidos: 0 }],
    ajustes: { limites_espontaneas: { por_hora: 3, madrugada: 2, por_dia: 12, sem_resposta: 2, orcamento_dia_usd: 0.3 }, orcamento: { conversa: 1.2, espontaneas: 0.3 } },
    fatos: v([{ id: 1, assunto: 'a Morgan', fato: 'A Morgan é filha dela.', toca: 'morgan', contradiz: 'nao tenho filh' }]),
    contatos: v([{ id: 1, nome: 'Contato de exemplo', relacao: 'amigo', circulo: 'conhecido' }]), bugs: v([{ id: 7, descricao: 'a TV sumiu', estado: 'aberto', criado_em: '2026-11-22T21:00:00Z' }]),
    aparelhos: [{ nome: 'iPhone', versao_app: 2, ultimo_uso: '2026-11-23T14:00:00Z' }], versao_minima: { versao: 0, api: 1 } };
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
  else if (caminho === 'jogo/cena') { r = await jogoDemo(c); if (r.ok === false) return r; }
  else if (caminho === 'jogo/celular') r = celularDemo(c);
  else if (caminho === 'agenda') r = agenda(c, estado);
  else if (caminho === 'financas') r = financas(c, estado);
  else if (caminho === 'pessoa') r = pessoa(c, estado);
  else if (caminho === 'aparelho') {
    r = c.acao === 'chave_push' ? { chave_publica: '' } : { mostrar_texto: false, aparelhos: [
      { id: 'x1', nome: 'iPhone', este: true, lembrado_ate: '2027-02-21' }, { id: 'x2', nome: 'iPad', ultimo_uso: '2026-11-22' }] };
  } else if (caminho.startsWith('painel/') && papelDemo() !== 'administrador') return { ok: false, erro: 'O painel não abriu. Só o administrador abre o painel; se for você, feche e abra o app de novo.' };
  else if (caminho === 'painel/bastidores') r = bastidoresDemo(c, estado);
  else if (caminho.startsWith('painel/')) r = painel(caminho.slice(7), c, estado);
  else r = { ok: false, erro: 'Não deu para carregar.' };
  return { ok: true, ...copia(r) };
}

export function zerar() { S = inicial(); }
