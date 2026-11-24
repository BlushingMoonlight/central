// Central — o adaptador entre as respostas dos workflows do n8n e o formato que as telas usam (o de app/demo.js).
// Só roda fora do modo demonstração. Cada caso diz de qual workflow vem a resposta. Telas sem caso aqui recebem a
// resposta como veio (o formato foi escrito igual dos dois lados).
const porData = (a, b) => String(a.enviada_em).localeCompare(String(b.enviada_em));
const proposta = (p) => (p ? Object.assign({ titulo: p.titulo || p.o_que || '', resumo: p.resumo || p.por_que || '' }, p) : null);

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
  if (caminho === 'financas' && acao === 'mes') {
    // Workflow 43: vence_7_dias e gasto_mes.
    if (!d.vence) d.vence = d.vence_7_dias || [];
    if (d.gasto_mes) { if (d.pessoal == null) d.pessoal = d.gasto_mes.pessoal; if (d.saas == null) d.saas = d.gasto_mes.saas; }
  }
  if (caminho === 'painel/pessoas' && acao === 'ler' && Array.isArray(d.pessoas) && d.pessoas.length && d.pessoas[0].modelos && !Array.isArray(d.pessoas[0].modelos)) {
    // Workflow 91: os modelos e as permissões vêm por pessoa; a tela mostra os da Pepper.
    const p = d.pessoas.find((x) => x.id === 'pepper') || d.pessoas[0];
    d.ficha = (p.ficha && p.ficha.texto) || '';
    d.modelos = Object.entries(p.modelos || {}).map(([camada, m]) => ({ camada, modelo: m.modelo }));
    d.permissoes = (p.permissoes || []).map((x) => ({ caminho: x.alvo, acesso: [x.ler ? 'lê' : '', x.escrever ? 'grava' : ''].filter(Boolean).join(' e ') }));
    d.pessoas = d.pessoas.map((x) => Object.assign({ estado: x.ativa ? 'ativa' : 'desligada', teto_usd: x.teto_mes_usd }, x));
  }
  return d;
}
