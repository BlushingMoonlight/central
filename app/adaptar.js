// Central — o adaptador entre as respostas dos workflows do n8n e o formato que as telas usam (o de app/demo.js).
// Só roda fora do modo demonstração. Cada caso diz de qual workflow vem a resposta. Telas sem caso aqui recebem a
// resposta como veio (o formato foi escrito igual dos dois lados).
const porData = (a, b) => String(a.enviada_em).localeCompare(String(b.enviada_em));
const proposta = (p) => (p ? Object.assign({ titulo: p.titulo || p.o_que || '', resumo: p.resumo || p.por_que || '' }, p) : null);

const hora = (iso) => (iso ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso)) : '');
const quando = (iso) => (iso ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric', month: 'numeric' }).format(new Date(iso)) + ', ' + hora(iso) : '');
const daPepper = (l) => (l || []).find((p) => (p.id || p.pessoa_id) === 'pepper') || (l || [])[0] || {};
const CAMADA = { mente: 'Mente', resposta: 'Resposta', critica: 'Crítica', motor: 'Motor', verificador: 'Verificador', visao: 'Visão',
  transcricao: 'Transcrição', voz: 'Voz', juiz: 'Juiz', memoria: 'Memória' };
const CHAVE = { paixao: 'Paixão', romance_agentes: 'Romance entre as pessoas', demissao: 'Demissão', dor_grave: 'Dor grave' };

// O Painel (workflows 90 a 96, DEC-123): as respostas vêm por pessoa e com os nomes do banco; a tela mostra a Pepper.
function painel(tela, d) {
  switch (tela) {
    case 'hoje': {
      const c = d.custos || {}; const m = daPepper(d.mundo); const b = d.ultimo_backup;
      return Object.assign({}, d, { falhas_abertas: (d.falhas || {}).abertas || 0, ia_hoje_usd: c.hoje_usd, ia_mes_usd: c.mes_usd,
        teto_mes_usd: daPepper(c.pessoas).teto_mes_usd,
        pedidos: (d.pedidos_novos || []).map((p) => ({ titulo: p.o_que, det: 'pedido por ' + (p.nome || 'ela') })),
        mundo: { estado: m.rodando === false ? 'Pausado' : 'Rodando', ultimo_ciclo: m.ultimo_ciclo ? hora(m.ultimo_ciclo.inicio) : 'nenhum ainda' },
        backup: b ? (b.ok ? quando(b.feito_em) : 'falhou em ' + quando(b.feito_em)) : 'nenhum ainda' });
    }
    case 'custos': {
      const p = daPepper(d.pessoas);
      return Object.assign({}, d, { teto_mes_usd: p.teto_mes_usd, teto_motor_dia_usd: p.teto_motor_dia_usd,
        camadas: (d.por_camada || []).filter((c) => c.pessoa_id === (p.pessoa_id || 'pepper')).map((c) => ({ nome: CAMADA[c.camada] || c.camada,
          det: `hoje · mês ${Number(c.mes_usd || 0).toFixed(2)} · entrada ${c.tokens_entrada || 0}, cache ${c.tokens_cache || 0}, saída ${c.tokens_saida || 0}, raciocínio ${c.tokens_raciocinio || 0}`, usd: c.hoje_usd })),
        mes: (d.pessoas || []).map((x) => ({ pessoa: x.nome, teto_usd: x.teto_mes_usd, usd: x.mes_usd })),
        // A parte da entrada que veio do cache, para o Jean ver que o cache pega (DEC-125).
        mensagens: (d.por_mensagem || []).map((m) => ({ hora: quando(m.em), texto: m.texto, usd: m.usd,
          cache: (() => { const e = (m.camadas || []).reduce((s, c) => s + Number(c.entrada || 0) + Number(c.cache || 0), 0); const k = (m.camadas || []).reduce((s, c) => s + Number(c.cache || 0), 0); return e ? Math.round(k / e * 100) : 0; })(),
          camadas: (m.camadas || []).map((c) => `${CAMADA[c.camada] || c.camada}: entrada ${c.entrada}, cache ${c.cache}, saída ${c.saida}, raciocínio ${c.raciocinio}, US$ ${Number(c.usd).toFixed(4)}`).join(' · ') })) });
    }
    case 'mundo': {
      const p = daPepper(d.pessoas); const r = p.ritmo || {};
      return Object.assign({}, d, { estado: p.pausa ? 'pausado' : 'rodando', pausado: !!p.pausa, ritmo_min: r.min_minutos, ritmo_max: r.max_minutos,
        teto_motor_dia_usd: p.teto_motor_dia_usd, motor_hoje_usd: p.motor_hoje_usd,
        ciclos: (p.ciclos || []).map((c) => ({ hora: hora(c.inicio) + (c.erro ? ' · ' + c.erro : ''), eventos: c.eventos || 0, usd: c.custo_usd || 0 })) });
    }
    case 'canone':
      return Object.assign({}, d, { eventos: (d.eventos || []).map((e) => Object.assign({}, e, { hora: quando(e.inicio),
        estado: e.estado === 'canone' ? 'aceito' : e.estado, motivo: e.motivo_recusa })) });
    case 'chaves': {
      const p = daPepper(d.pessoas);
      return Object.assign({}, d, { humor: p.humor,
        chaves: (p.chaves || []).map((c) => ({ id: c.tipo, nome: CHAVE[c.tipo] || c.tipo, ligada: c.ligada, det: c.pode_surgir_sozinha ? 'pode surgir sozinha' : '' })),
        sentimentos: (p.sentimentos || []).filter((s) => s.por_quem === 'jean').map((s) => ({ nome: s.tipo, valor: s.valor })) });
    }
    case 'cupula': {
      const p = daPepper(d.pessoas); const g = p.grupos || {};
      return Object.assign({}, d, { amigos: (g.amigos || []).map((x) => x.nome),
        conhecidos: (g.lente || []).map((x) => x.nome), inspiracoes: (g.inspiracao || []).map((x) => x.nome),
        _membros: Object.entries(g).flatMap(([grupo, l]) => l.map((x) => ({ id: x.id, nome: x.nome, grupo }))) });
    }
    case 'carteira': {
      const p = daPepper(d.pessoas); const conta = (p.contas || []).find((c) => c.moeda === 'USD') || (p.contas || [])[0] || {};
      const cart = (p.carteiras || [])[0] || {}; const pos = cart.posicoes || [];
      const total = pos.reduce((s, x) => s + Number(x.valor_atual || 0), 0) + Number(cart.dinheiro_parado || 0);
      const mes = pos.reduce((s, x) => s + Number(x.resultado_mes || 0), 0);
      return Object.assign({}, d, { conta_usd: Number(conta.saldo || 0), carteira_usd: total, variacao_mes: total ? mes / (total - mes) * 100 : null,
        posicoes: pos.map((x) => ({ nome: x.ticker, det: `${x.quantidade} a ${x.preco_atual ?? x.preco_medio} ${x.moeda || ''}`.trim(),
          variacao: x.preco_medio ? ((Number(x.preco_atual ?? x.preco_medio) / Number(x.preco_medio)) - 1) * 100 : 0 })),
        ordens: (cart.ordens || []).map((o) => ({ texto: `${o.lado === 'venda' ? 'Vendeu' : 'Comprou'} ${o.quantidade} ${o.ticker}`, motivo: o.motivo, data: o.criada_em })) });
    }
    case 'modulos':
      return Object.assign({}, d, { modulos: (d.modulos || []).map((m) => Object.assign({ id: m.nome, det: m.nota || m.secao || '' }, m,
        { nome: String(m.nome).replace(/_/g, ' ').replace(/^./, (x) => x.toUpperCase()) })) });
    case 'pedidos':
      return Object.assign({}, d, { pedidos: (d.pedidos || []).map((p) => Object.assign({ titulo: p.o_que, data: p.atualizado_em || p.criado_em }, p)) });
    case 'registros':
      return Object.assign({}, d, { falhas: (d.falhas_abertas || []).map((f) => ({ id: f.id, texto: `${f.workflow} · ${f.no || f.tipo}`, quando: quando(f.em) })),
        registro: (d.registro || []).map((r) => ({ hora: hora(r.em), texto: r.acao, det: r.workflow, usd: r.custo_usd })) });
    case 'sistema': {
      const b = (d.backups || [])[0]; const rel = daPepper(d.relogio_da_vida);
      const testes = daPepper(d.testes).resultados || [];
      // O relógio está fora quando parou (o último ciclo tem mais de 6 horas; o ritmo vai até 4). Um ciclo só de código
      // não é "fora": o motivo aparece em Mundo (DEC-124). As fontes vêm da conferência do 07 ("saude").
      const parado = !rel.ultimo_ciclo || Date.now() - Date.parse(rel.ultimo_ciclo) > 6 * 3600000;
      const saude = ((d.estado || []).find((e) => e.chave === 'saude') || {}).valor || {};
      const NOMES = { openai: 'OpenAI', yahoo: 'Cotações (Yahoo Finance)', rss: 'Notícias (RSS)', open_meteo: 'Clima (Open-Meteo)', awesomeapi: 'Câmbio (AwesomeAPI)' };
      return Object.assign({}, d, { servicos: [
        { nome: 'Relógio da vida', estado: !rel.ultimo_ciclo ? 'ainda não rodou' : parado ? 'fora' : 'último ciclo ' + quando(rel.ultimo_ciclo) + (rel.erro ? ' · só no código' : '') },
        ...Object.entries(saude.fontes || {}).map(([k, x]) => ({ nome: NOMES[k] || k, estado: x.ok ? 'no ar' : 'fora' + (x.erro ? ' (' + x.erro + ')' : '') })),
        { nome: 'Backup', estado: b ? (b.ok ? 'feito ' + quando(b.feito_em) : 'fora') : 'nenhum ainda' }],
        testes: testes.map((t) => ({ nome: t.teste, passou: t.passou, det: (t.passou ? 'passou' : 'não passou') + (t.motivo ? ': ' + t.motivo : '') + ' · ' + quando(t.rodada_em) })) });
    }
    default: return d;
  }
}

export function adaptar(caminho, corpo, d) {
  const acao = corpo && corpo.acao;
  if (caminho === 'mensagem' && acao === 'listar') {
    // Workflow 20: as mensagens e as linhas da interface vêm separadas; a proposta vem com o_que e por_que.
    const linhas = (d.linhas || []).map((l) => Object.assign({ autor: 'central' }, l));
    d.mensagens = (d.mensagens || []).map((m) => Object.assign({}, m, { autor: m.autor === 'pessoa' ? 'pepper' : m.autor }))
      .concat(linhas).sort(porData);
    d.proposta = proposta(d.proposta);
  }
  if (caminho === 'proposta' || caminho === 'mensagem') d.proposta = proposta(d.proposta);
  if (caminho === 'vida' && acao === 'hoje') {
    // Workflow 41: as propostas vêm com o_que; as áreas, com o nome e o número de abertas.
    d.precisa = (d.precisa || []).map((p) => (p.tipo === 'proposta' ? Object.assign({ titulo: p.o_que }, p) : p));
    d.areas = (d.areas || []).map((a) => Object.assign({ abertas: a.abertas ?? a.tarefas_abertas ?? a.total ?? 0 }, a));
  }
  if (caminho === 'combinados' && Array.isArray(d.combinados)) d.combinados = d.combinados.map((c) => Object.assign({ desde: c.criado_em }, c));
  if (caminho === 'vida') {
    // Workflow 41: a área vem com "area" (o nome curto) no lugar de "id"; a lista da área vem junta em "tarefas".
    const comId = (a) => (a ? Object.assign({ id: a.area }, a) : a);
    if (Array.isArray(d.areas)) d.areas = d.areas.map(comId);
    if (acao === 'area' && d.area) {
      d.area = comId(d.area);
      const l = d.tarefas || [];
      if (!d.com_prazo) d.com_prazo = l.filter((t) => t.prazo);
      if (!d.sem_prazo) d.sem_prazo = l.filter((t) => !t.prazo);
    }
    if (d.tarefa && d.tarefa.area_id == null) d.tarefa.area_id = d.tarefa.area;
  }
  if (caminho === 'agenda') {
    // Workflow 42: o dia vem separado por tipo; o compromisso vem com titulo, data, hora, local e duracao.
    const quando = (c) => (c.data ? c.data + 'T' + (c.hora || '00:00') + ':00-03:00' : null);
    if (acao === 'proximos' && Array.isArray(d.dias)) {
      d.dias = d.dias.map((x) => (x.itens ? x : Object.assign({}, x, { itens: [].concat(
        (x.compromissos || []).map((c) => ({ tipo: 'compromisso', id: c.id, titulo: c.titulo, hora: c.hora, det: c.local })),
        (x.prazos || []).map((t) => ({ tipo: 'prazo', id: t.id, titulo: t.titulo, det: 'prazo' })),
        (x.aniversarios || []).map((a) => ({ tipo: 'aniversario', id: a.id, titulo: 'Aniversário de ' + a.nome, det: a.fara_anos ? `faz ${a.fara_anos} anos` : a.relacao })),
        (x.financas || []).map((f) => ({ tipo: f.tipo === 'assinatura' ? 'renovacao' : f.tipo, id: f.id, titulo: f.titulo, valor: f.valor })),
      ) })));
    }
    if (d.compromisso) {
      const c = d.compromisso;
      d.compromisso = Object.assign({ o_que: c.titulo, quando: quando(c), onde: c.local, duracao_min: c.duracao }, c,
        { lembrete: c.lembrete != null ? `${c.lembrete} minutos antes` : null });
    }
    if (acao === 'aniversarios' && !d.contatos) d.contatos = (d.aniversarios || []).map((c) => Object.assign({}, c, { aniversario: c.proximo || c.aniversario }));
    if (d.contato) d.contato = Object.assign({}, d.contato, { aniversario: d.contato.proximo || d.contato.aniversario });
  }
  if (caminho === 'financas') {
    // Workflow 43: os nomes do arquivo (estabelecimento, apelido, o_que, com_quem, proxima...) viram os da tela.
    const meio = (m) => (m ? String(m).split('/').pop().replace(/-/g, ' ') : '');
    const gasto = (g) => Object.assign({ titulo: g.estabelecimento || g.categoria || 'Gasto', onde: g.estabelecimento, meio: meio(g.meio_pagamento) }, g,
      { itens: Array.isArray(g.itens) ? (g.itens.length ? g.itens.length + ' itens' : '') : g.itens });
    const assin = (a) => Object.assign({ titulo: a.nome, renova: a.proxima, aviso_dias: a.aviso_antes, meio: meio(a.meio_pagamento), vou_cancelar: a.estado === 'vou_cancelar' }, a);
    if (Array.isArray(d.gastos)) d.gastos = d.gastos.map(gasto);
    if (d.gasto) d.gasto = gasto(d.gasto);
    if (Array.isArray(d.assinaturas)) {
      d.assinaturas = d.assinaturas.map(assin);
      const t = d.totais || {};
      if (d.pessoal_mes == null && t.pessoal) d.pessoal_mes = t.pessoal.mensal;
      if (d.saas_mes == null && t.saas) d.saas_mes = t.saas.mensal;
      if (d.total_ano == null && t.tudo) d.total_ano = t.tudo.anual;
    }
    if (d.assinatura) d.assinatura = assin(d.assinatura);
    if (acao === 'parcelas' && Array.isArray(d.parcelas)) d.parcelas = d.parcelas.map((p) => Object.assign({}, p, { titulo: p.o_que, total: p.parcelas, valor: p.valor_parcela }));
    if (acao === 'dividas') {
      const q = (x) => Object.assign({ quem: x.com_quem }, x);
      d.devo = (d.devo || []).map(q); if (!d.devem) d.devem = (d.me_devem || []).map(q);
    }
    if (acao === 'meios' && Array.isArray(d.meios)) {
      const FORMA = { credito: 'crédito', debito: 'débito', pix: 'Pix' };
      d.meios = d.meios.map((m) => Object.assign({ nome: m.apelido, det: [FORMA[m.forma] || m.forma, m.final ? 'final ' + m.final : '',
        m.virtual_uso_unico ? 'virtual, uso único' : '', m.dia_vencimento ? 'vence dia ' + m.dia_vencimento : ''].filter(Boolean).join(' · ') }, m));
    }
    if (acao === 'desejos' && Array.isArray(d.desejos)) d.desejos = d.desejos.map((x) => Object.assign({ titulo: x.o_que, valor: x.preco_estimado }, x));
  }
  if (caminho === 'financas' && acao === 'mes') {
    // Workflow 43: vence_7_dias e gasto_mes.
    if (!d.vence) d.vence = d.vence_7_dias || [];
    if (d.gasto_mes) { if (d.pessoal == null) d.pessoal = d.gasto_mes.pessoal; if (d.saas == null) d.saas = d.gasto_mes.saas; }
  }
  if (caminho === 'pessoa') {
    // Workflow 80: a pessoa vem dentro de "pessoa"; o pendente traz mes_nome e a situação; o contrato, dia_pagamento.
    const quando = (p) => (p.situacao === 'atrasado' ? `atrasado há ${p.dias_de_atraso} ${p.dias_de_atraso === 1 ? 'dia' : 'dias'}`
      : p.situacao === 'vence_hoje' ? 'vence hoje' : 'a vencer');
    const conta = (p) => Object.assign({ titulo: 'Salário de ' + String(p.mes_nome || '').replace(/ de \d{4}$/, ''), det: quando(p),
      data: p.devido_em, mes: String(p.mes || '').slice(0, 7) }, p);
    if (d.pessoa) Object.assign(d, { nome: d.pessoa.nome, cargo: d.pessoa.cargo, desde: d.pessoa.desde });
    if (Array.isArray(d.pendente)) d.pendente = d.pendente.map(conta);
    if (acao === 'contrato') {
      const c = d.contrato || {};
      d.contrato = Object.assign({}, c, { dia: c.dia_pagamento, moeda: c.moeda === 'BRL' ? `Em reais; entra em dólar pelo câmbio do dia ${c.dia_pagamento}` : c.moeda });
      if (!d.vence) d.vence = d.pendente || [];
      d.holerites = (d.holerites || []).map((h) => Object.assign({ titulo: 'Holerite de ' + String(h.mes_nome || '').replace(/ de \d{4}$/, ''), data: h.emitido_em, valor: h.liquido }, h));
    }
  }
  if (caminho === 'aparelho' && acao === 'listar' && Array.isArray(d.aparelhos)) {
    // Workflow 12: "mostrar o texto" vem por aparelho, e "lembrado" sem data: o aparelho fica lembrado por 30 dias de uso.
    const este = d.aparelhos.find((a) => a.este) || {};
    if (d.mostrar_texto == null) d.mostrar_texto = Boolean(este.mostrar_texto);
    d.aparelhos = d.aparelhos.map((a) => Object.assign({ lembrado_ate: a.lembrado && (a.ultimo_uso || a.criado_em)
      ? new Date(Date.parse(a.ultimo_uso || a.criado_em) + 30 * 86400000).toISOString() : null }, a));
  }
  if (caminho === 'painel/pessoas' && acao === 'ler' && Array.isArray(d.pessoas) && d.pessoas.length && d.pessoas[0].modelos && !Array.isArray(d.pessoas[0].modelos)) {
    // Workflow 91: os modelos e as permissões vêm por pessoa; a tela mostra os da Pepper.
    const p = d.pessoas.find((x) => x.id === 'pepper') || d.pessoas[0];
    d.ficha = (p.ficha && p.ficha.texto) || '';
    d.modelos = Object.entries(p.modelos || {}).map(([camada, m]) => ({ camada, modelo: m.modelo }));
    d.permissoes = (p.permissoes || []).map((x) => ({ caminho: x.alvo, acesso: [x.ler ? 'lê' : '', x.escrever ? 'grava' : ''].filter(Boolean).join(' e ') }));
    d.pessoas = d.pessoas.map((x) => Object.assign({ estado: x.ativa ? 'ativa' : 'desligada', teto_usd: x.teto_mes_usd }, x));
  }
  if (caminho.startsWith('painel/') && acao === 'ler' && caminho !== 'painel/pessoas') return painel(caminho.slice(7), d);
  return d;
}
