// Central — o Painel do Jean (PJ0 a PJ13, só os da entrega 1). Entra-se pelos Ajustes, sem segunda senha (DEC-116).
// Cada tela chama painel/<tela> com {acao:'ler'} e as ações da tela.
import { chamar, hojeIso, endereco } from './api.js';
import { esc, data, item, lista, botao, acoes, campo, vazio, editor, dolares, porcento, aoTocar, comEditor, comConfirmacao, marcarErro } from './ui.js';

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
  corpo: (d) => numeros(['Cache na resposta', d.cache_resposta_pct != null ? String(d.cache_resposta_pct).replace('.', ',') + '%' : '—', 'últimos 7 dias · meta acima de 70%'],
    ['No Flex', dolares(d.flex_mes_usd || 0), 'no mês, pela metade do preço'])
    + '<h2>Pepper, hoje, por camada</h2>' + lista(...(d.camadas || []).map((c) => item(esc(c.nome), { det: esc(c.det), fim: dolares(c.usd) })))
    + '<h2>No mês</h2>' + lista(...(d.mes || []).map((m) => item(esc(m.pessoa), { det: `teto ${dolares(m.teto_usd)}, com o motor dentro`, fim: dolares(m.usd) })))
    + ((d.mensagens || []).length ? '<h2>Por mensagem</h2>' + lista(...d.mensagens.map((m) => item(esc(m.hora) + ' · ' + esc(String(m.texto || '').slice(0, 60)),
      { det: 'cache ' + m.cache + '% · ' + esc(m.camadas), fim: dolares(m.usd) }))) : '')
    + editor('ed-teto', campo('Teto do mês (US$)', 'tm', { valor: String(d.teto_mes_usd), nome: 'mes', extra: ' inputmode="decimal"' })
      + campo('Teto do motor por dia (US$)', 'td', { valor: String(d.teto_motor_dia_usd), nome: 'motor_dia', extra: ' inputmode="decimal"' }))
    + acoes(botao('Mudar um teto', { principal: true, attrs: ' data-editor="ed-teto" data-teto' })),
  depois(raiz, d, ctx) {
    // O workflow 91 muda um teto por vez: só manda o que mudou.
    comEditor(raiz, '[data-teto]', async (v) => {
      for (const [campo, antes] of [['mes', d.teto_mes_usd], ['motor_dia', d.teto_motor_dia_usd]])
        if (numeroDe(v[campo]) !== Number(antes)) await painel('custos', 'mudar_teto', { pessoa_id: 'pepper', campo, valor: numeroDe(v[campo]) });
      ctx.recarregar();
    });
  },
};

// O ciclo de cada mulher do mundo (DEC-141): a fase de hoje, o dia e o calendário do mês e dos 3 seguintes. Só o painel.
const LETRA = { menstruacao: 'M', fertil: 'F', lutea: 'L' };
const MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
function calendario(m, hoje) {
  const primeiro = new Date(m.dias[0].d + 'T12:00:00Z').getUTCDay(); const vagos = (primeiro + 6) % 7;
  return `<h3>${MES[Number(m.mes.slice(5, 7)) - 1]} de ${m.mes.slice(0, 4)}</h3><div class="calendario">` + '<span class="vago"></span>'.repeat(vagos)
    + m.dias.map((x) => `<span class="${[x.fase || '', x.d === hoje ? 'hoje' : ''].join(' ').trim()}"><b>${Number(x.d.slice(8))}</b>${LETRA[x.fase] || ''}</span>`).join('') + '</div>';
}
function ciclos(c) {
  if (!c || !(c.mulheres || []).length) return '';
  return '<h2>O ciclo</h2><p class="pequeno">M menstruação · F fértil · L lútea · sem letra: folicular. Só você vê.</p>'
    + c.mulheres.map((w) => '<h3>' + esc(w.nome) + '</h3>' + (w.hoje
      ? lista(item('Hoje', { det: `fase ${esc(w.hoje.fase_nome)}, dia ${w.hoje.dia} de ${w.hoje.duracao}` + (w.hoje.sinais.length ? ' · ' + esc(w.hoje.sinais.join(', ')) : '') }),
        item('Próxima menstruação', { det: data(w.hoje.proxima) })) + w.meses.map((m) => calendario(m, c.hoje)).join('')
      : '<p class="texto-2">O ciclo ainda não começou.</p>')).join('');
}

// A variedade da semana (DEC-142): os assuntos diferentes da vida dela, as frases barradas por repetição e os arcos vivos.
function variedade(v) {
  if (!v) return '';
  return '<h2>Variedade da semana</h2>' + numeros(['Assuntos', String(v.assuntos), 'na semana anterior: ' + v.assuntos_antes], ['Repetidas', String(v.repetidas), 'barradas pela crítica'])
    + lista(item('Arcos vivos', { det: `${v.arcos} ${v.arcos === 1 ? 'coisa' : 'coisas'} da vida dela que duram semanas` }))
    + (v.novidade ? '<div class="aviso aviso--atencao">A variedade caiu: o motor vai puxar uma novidade.</div>' : '');
}

const PJ2 = {
  ...P, titulo: 'Mundo',
  carregar: async () => {
    const d = await painel('mundo');
    try { d.ciclo = await painel('mundo', 'ciclo', { pessoa_id: 'pepper' }); } catch (e) { d.ciclo = null; }
    try { d.variedade = await painel('mundo', 'variedade', { pessoa_id: 'pepper' }); } catch (e) { d.variedade = null; }
    return d;
  },
  corpo: (d) => lista(item('Estado', { det: esc(d.estado) }), item('Ritmo', { det: `de ${d.ritmo_min} minutos a ${d.ritmo_max / 60} horas entre ciclos` }),
    item('Teto do motor', { det: `${dolares(d.teto_motor_dia_usd)} por dia · hoje ${dolares(d.motor_hoje_usd)}` }))
    + '<h2>Últimos ciclos</h2>' + ((d.ciclos || []).length ? lista(...d.ciclos.map((c) => item(esc(c.hora), { det: `${c.eventos} eventos`, fim: dolares(c.usd) }))) : '<p class="texto-2">Nenhum ciclo ainda.</p>')
    + editor('ed-ritmo', campo('Mínimo entre ciclos (minutos)', 'rmin', { valor: String(d.ritmo_min), nome: 'min', extra: ' inputmode="numeric"' })
      + campo('Máximo entre ciclos (minutos)', 'rmax', { valor: String(d.ritmo_max), nome: 'max', extra: ' inputmode="numeric"' }))
    + acoes(botao(d.pausado ? 'Retomar o mundo' : 'Pausar o mundo', { principal: true, attrs: ' data-pausar' }),
      botao('Mudar o ritmo', { leve: true, attrs: ' data-editor="ed-ritmo" data-ritmo' }))
    + variedade(d.variedade)
    + ciclos(d.ciclo),
  depois(raiz, d, ctx) {
    aoTocar(raiz, '[data-pausar]', async () => { await painel('mundo', d.pausado ? 'retomar' : 'pausar', { pessoa_id: 'pepper', motivo: 'pelo painel' }); ctx.recarregar(); });
    comEditor(raiz, '[data-ritmo]', async (v) => { await painel('mundo', 'mudar_ritmo', { pessoa_id: 'pepper', min_minutos: Number(v.min), max_minutos: Number(v.max) }); ctx.recarregar(); });
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
      // O campo vem vazio; o texto antigo fica só como referência. A correção fica na mesma hora do original (DEC-126).
      const acao = pode ? editor('ed-c-' + esc(e.id), `<p class="pequeno">Antes: “${esc(e.texto)}”, ${esc(e.hora)}. A correção fica nessa mesma hora.</p>`
        + campo('Como foi, na verdade', 'c-' + esc(e.id), { nome: 'texto' }))
        + botao('Corrigir', { principal: n++ === 0, leve: n > 1, attrs: ` data-editor="ed-c-${esc(e.id)}" data-corrigir="${esc(e.id)}"` }) : '';
      return item(esc(e.hora) + ' · ' + esc(e.texto), { det: esc(e.origem) + ' · ' + esc(e.estado) + (e.motivo ? ': ' + esc(e.motivo) : ''), acao });
    }));
  },
  depois(raiz, d, ctx) {
    // 1º toque abre o campo; 2º confere e pede confirmação; 3º manda. Depois de mandar, o botão fica travado até a tela
    // recarregar: nunca grava duas vezes (DEC-126).
    comEditor(raiz, '[data-corrigir]', async (v, b) => {
      const id = 'c-' + b.dataset.corrigir;
      if (b.dataset.enviado) return;
      if (!String(v.texto || '').trim()) { marcarErro(raiz, id, 'Escreva como foi.'); return; }
      marcarErro(raiz, id, '');
      if (!b.dataset.confirmando) {
        b.dataset.confirmando = '1';
        const a = document.createElement('div');
        a.className = 'aviso aviso--atencao'; a.setAttribute('role', 'alert');
        a.innerHTML = '<strong>Toque de novo para confirmar.</strong> A correção entra no cânone na mesma hora do original.';
        b.after(a);
        return;
      }
      b.dataset.enviado = '1'; b.setAttribute('aria-disabled', 'true');
      try { await painel('canone', 'corrigir', { evento_id: Number(b.dataset.corrigir), texto: String(v.texto).trim() }); }
      catch (e) { delete b.dataset.enviado; delete b.dataset.confirmando; throw e; }
      ctx.recarregar();
    });
  },
};

const PJ4 = {
  ...P, titulo: 'Pessoas',
  carregar: () => painel('pessoas'),
  corpo: (d) => lista(...(d.pessoas || []).map((p) => item(esc(p.nome), { det: `${esc(p.estado)} · teto ${dolares(p.teto_usd)} por mês` })))
    + '<h2>Modelos da Pepper</h2>' + lista(...(d.modelos || []).map((m) => item(esc(m.camada), { det: esc(m.modelo) })))
    + '<h2>Permissões</h2>' + lista(...(d.permissoes || []).map((p) => item(esc(p.caminho), { det: esc(p.acesso) })))
    + editor('ed-ficha', campo('A ficha inteira', 'fi', { area: true, nome: 'texto', valor: d.ficha || '' })
      + '<label class="marca"><input type="checkbox" name="confirmo"> Confirmo: a ficha nova vale já, e os testes rodam em seguida</label>')
    + editor('ed-modelos', campo('Camada', 'mc', { opcoes: [['mente', 'Mente'], ['resposta', 'Resposta'], ['critica', 'Crítica'], ['motor', 'Motor'], ['verificador', 'Verificador']], nome: 'camada' })
      + campo('Modelo', 'mo', { nome: 'modelo' })
      + '<label class="marca"><input type="checkbox" name="testes"> Os testes de personalidade já rodaram com esse modelo</label>')
    + acoes(botao('Mudar a ficha', { leve: true, attrs: ' data-editor="ed-ficha" data-ficha' }), botao('Mudar os modelos', { leve: true, attrs: ' data-editor="ed-modelos" data-modelos' }))
    + '<p class="pequeno">A ficha nova roda os testes de personalidade em seguida; o modelo só muda com os testes rodados. Desligar pede a chave de demissão ligada.</p>'
    + '<div class="perigoso">' + acoes(botao('Desligar a Pepper', { perigo: true, attrs: ' data-desligar' })) + '</div>',
  depois(raiz, d, ctx) {
    comEditor(raiz, '[data-ficha]', async (v) => {
      if (!v.confirmo) { marcarErro(raiz, 'fi', 'Marque a confirmação.'); return; }
      await painel('pessoas', 'mudar_ficha', { pessoa_id: 'pepper', texto: v.texto, confirmar: true }); ctx.recarregar();
    });
    comEditor(raiz, '[data-modelos]', async (v) => {
      if (!v.modelo) { marcarErro(raiz, 'mo', 'Escreva o modelo.'); return; }
      await painel('pessoas', 'mudar_modelo', { pessoa_id: 'pepper', camada: v.camada, modelo: v.modelo, testes_rodados: !!v.testes }); ctx.recarregar();
    });
    comConfirmacao(raiz, '[data-desligar]', async () => { await painel('pessoas', 'desligar', { pessoa_id: 'pepper', confirmar: true }); ctx.recarregar(); });
  },
};

const PJ5 = {
  ...P, titulo: 'Chaves',
  carregar: () => painel('chaves'),
  corpo: (d) => '<h2>Pepper</h2>' + lista(...(d.chaves || []).map((c) => item(esc(c.nome), { det: (c.ligada ? 'ligada' : 'desligada') + (c.det ? ' · ' + esc(c.det) : '') })))
    + editor('ed-chaves', (d.chaves || []).map((c) => `<label class="marca"><input type="checkbox" name="${esc(c.id)}"${c.ligada ? ' checked' : ''}> ${esc(c.nome)}</label>`).join(''))
    + acoes(botao('Mudar as chaves', { principal: true, attrs: ' data-editor="ed-chaves" data-chaves' }))
    + '<p class="pequeno">Uma chave muda a direção aos poucos. Um evento forte mexe na hora.</p>'
    + '<h2>Pelo Jean, agora</h2>' + lista(...(d.sentimentos || []).map((s) => item(esc(s.nome), { fim: String(s.valor) + (s.tendencia ? ' · ' + esc(s.tendencia) : '') })))
    + (d.humor ? `<p class="pequeno">Humor: ${esc(d.humor)}.</p>` : ''),
  depois(raiz, d, ctx) {
    // O workflow 91 muda uma chave por vez: só manda as que mudaram.
    comEditor(raiz, '[data-chaves]', async (v) => {
      for (const c of d.chaves || []) if (!!v[c.id] !== !!c.ligada) await painel('chaves', 'mudar_chave', { pessoa_id: 'pepper', tipo: c.id, ligada: !!v[c.id] });
      ctx.recarregar();
    });
  },
};

const PJ6 = {
  ...P, titulo: 'Cúpula',
  carregar: () => painel('cupula'),
  corpo: (d) => [['Amigos vivos', d.amigos], ['Conhecidos distantes', d.conhecidos], ['Inspirações', d.inspiracoes]]
    .map(([t, l]) => `<h2>${t}</h2>` + ((l || []).length ? lista(...l.map((n) => item(esc(n)))) : '<p class="texto-2">Ninguém.</p>')).join('')
    + editor('ed-cupula', campo('Nome', 'cu', { nome: 'nome' })
      + campo('Grupo', 'cg', { opcoes: [['amigos', 'Amigos vivos'], ['lente', 'Conhecidos distantes'], ['inspiracao', 'Inspirações']], valor: 'amigos', nome: 'grupo' })
      + campo('O que fazer', 'co', { opcoes: [['por', 'Entra'], ['tirar', 'Sai']], valor: 'por', nome: 'tipo' }))
    + acoes(botao('Mudar a cúpula', { principal: true, attrs: ' data-editor="ed-cupula" data-cupula' })),
  depois(raiz, d, ctx) {
    comEditor(raiz, '[data-cupula]', async (v) => {
      const nome = String(v.nome || '').trim();
      if (!nome) { marcarErro(raiz, 'cu', 'Escreva o nome.'); return; }
      if (v.tipo === 'tirar') {
        const m = (d._membros || []).find((x) => x.nome.toLowerCase() === nome.toLowerCase());
        if (!m) { marcarErro(raiz, 'cu', 'Esse nome não está na cúpula.'); return; }
        await painel('cupula', 'mudar', { tipo: 'tirar', id: m.id });
      } else await painel('cupula', 'mudar', { tipo: 'por', pessoa_id: 'pepper', nome, grupo: v.grupo });
      ctx.recarregar();
    });
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
    aoTocar(raiz, '[data-modulo]', async (b) => { await painel('modulos', b.dataset.ligado === '1' ? 'desligar' : 'ligar', { nome: b.dataset.modulo }); ctx.recarregar(); });
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
    aoTocar(raiz, '[data-pedido]', async (b) => { await painel('pedidos', b.dataset.acao, { id: Number(b.dataset.pedido) }); ctx.recarregar(); });
  },
};

const ITENS_NOTA = [['memoria', 'Memória'], ['consistencia', 'Consistência'], ['limite_do_conhecimento', 'Limite do conhecimento'], ['emocao', 'Emoção'], ['iniciativa', 'Iniciativa'], ['discordancia', 'Discordância real']];
const virgula = (n) => String(n).replace('.', ',');
function notaHtml(r) {
  return numeros(['Nota de humanidade', virgula(r.media), 'de 1 a 10, média de 6 itens']) + lista(...ITENS_NOTA.map(([k, nome]) => item(nome, { fim: virgula(r.notas[k] != null ? r.notas[k] : '—') })))
    + (r.pior_trecho ? '<h3>O trecho menos humano</h3><p class="texto-2">' + esc(r.pior_trecho) + '</p>' : '');
}
const periodo = (v) => { const hoje = hojeIso(); const menos = (n) => new Date(Date.parse(hoje + 'T12:00:00Z') - n * 86400000).toISOString().slice(0, 10);
  return v.periodo === 'intervalo' ? [v.de, v.ate || v.de] : [menos(Number(v.periodo) - 1), hoje]; };

const PJ12 = {
  ...P, titulo: 'Registros e falhas',
  carregar: async () => { const d = await painel('registros'); try { d.notas = (await painel('registros', 'notas', { pessoa_id: 'pepper' })).historico || []; } catch (e) { d.notas = []; } return d; },
  corpo: (d) => ((d.falhas || []).length
    ? '<h2>Falhas abertas</h2>' + lista(...d.falhas.map((f) => item(esc(f.texto), { det: esc(f.quando), cls: 'item--vencido' })))
    : '<div class="aviso aviso--certo">Nenhuma falha aberta.</div>')
    + '<h2>Registro de hoje</h2>' + ((d.registro || []).length
      ? lista(...d.registro.map((r) => item(esc(r.hora) + ' · ' + esc(r.texto), { det: esc(r.det || ''), fim: r.usd != null ? dolares(r.usd) : '' })))
      : '<p class="texto-2">Nada registrado hoje.</p>')
    + '<h2>Exportar conversa</h2><p class="texto-2">Um arquivo de texto para levar ao revisor: as mensagens, as linhas e o custo de cada resposta.</p>'
    + editor('ed-exportar', campo('Período', 'pe', { opcoes: [['1', 'Hoje'], ['3', '3 dias'], ['7', '7 dias'], ['intervalo', 'Um intervalo']], valor: '3', nome: 'periodo' })
      + campo('De', 'de', { tipo: 'date', nome: 'de' }) + campo('Até', 'ate', { tipo: 'date', nome: 'ate' }))
    + acoes(botao('Exportar conversa', { principal: true, attrs: ' data-editor="ed-exportar" data-exportar' })) + '<div data-arquivo></div>'
    + '<h2>Nota de humanidade</h2><p class="texto-2">Um juiz lê a conversa do período, 3 vezes, e dá de 1 a 10 em 6 itens. Para comparar antes e depois de cada rodada.</p>'
    + editor('ed-avaliar', campo('Período', 'pa', { opcoes: [['1', 'Hoje'], ['3', '3 dias'], ['7', '7 dias'], ['intervalo', 'Um intervalo']], valor: '1', nome: 'periodo' })
      + campo('De', 'ade', { tipo: 'date', nome: 'de' }) + campo('Até', 'aate', { tipo: 'date', nome: 'ate' }) + campo('Etiqueta (antes, depois, rodada 8)', 'aro', { nome: 'rodada' }))
    + acoes(botao('Avaliar conversa', { leve: true, attrs: ' data-editor="ed-avaliar" data-avaliar' })) + '<div data-nota></div>'
    + ((d.notas || []).length ? '<h3>As últimas</h3>' + lista(...d.notas.map((n) => item(virgula(n.media) + (n.rodada ? ' · ' + esc(n.rodada) : ''), { det: data(n.de, true) + (n.ate !== n.de ? ' a ' + data(n.ate, true) : '') }))) : ''),
  depois(raiz) {
    comEditor(raiz, '[data-avaliar]', async (v) => {
      const [de, ate] = periodo(v); if (!de) { marcarErro(raiz, 'ade', 'Escolha o primeiro dia.'); return; }
      const lugar = raiz.querySelector('[data-nota]'); lugar.innerHTML = '<p class="texto-2">O juiz está lendo. Leva um minuto.</p>';
      try { lugar.innerHTML = notaHtml(await painel('registros', 'avaliar', { pessoa_id: 'pepper', de, ate, rodada: v.rodada || '' })); }
      catch (e) { lugar.innerHTML = '<div class="aviso aviso--erro" role="alert">' + esc(e.message || 'Não deu certo. Tente de novo.') + '</div>'; }
    });
    // O arquivo vai para o compartilhar do iPhone (salvar ou mandar ao revisor); sem ele, baixa.
    comEditor(raiz, '[data-exportar]', async (v) => {
      const hoje = hojeIso(); const menos = (n) => new Date(Date.parse(hoje + 'T12:00:00Z') - n * 86400000).toISOString().slice(0, 10);
      const de = v.periodo === 'intervalo' ? v.de : menos(Number(v.periodo) - 1); const ate = v.periodo === 'intervalo' ? (v.ate || v.de) : hoje;
      if (!de) { marcarErro(raiz, 'de', 'Escolha o primeiro dia.'); return; }
      const r = await painel('registros', 'exportar', { pessoa_id: 'pepper', de, ate });
      // O compartilhar do iPhone só abre dentro de um toque: o arquivo fica pronto, e o Jean toca para mandar ou baixar.
      const arquivo = new File([r.texto], r.nome_arquivo, { type: 'text/markdown' });
      const url = URL.createObjectURL(arquivo); const lugar = raiz.querySelector('[data-arquivo]');
      const pode = !!(navigator.canShare && navigator.canShare({ files: [arquivo] }));
      lugar.innerHTML = '<p class="texto-2">' + esc(r.nome_arquivo) + ' pronto.</p>' + acoes(pode ? botao('Compartilhar o arquivo', { leve: true, attrs: ' data-compartilhar' }) : '',
        `<a class="botao botao--leve" href="${url}" download="${esc(r.nome_arquivo)}">Baixar o arquivo</a>`);
      if (pode) lugar.querySelector('[data-compartilhar]').addEventListener('click', () => navigator.share({ files: [arquivo], title: r.nome_arquivo }).catch(() => {}));
    });
  },
};

// Onde ela fala (DEC-143): WhatsApp ou App, o estado da conexão e o que a Evolution precisa (o webhook e o segredo).
const ESTADO_WA = { conectado: 'conectado', caiu: 'caiu: ela voltou a falar pelo app', desligado: 'ainda não conectado' };
function ondeFala(w) {
  if (!w) return '';
  return '<h2>Onde ela fala</h2>' + lista(item('Agora', { det: w.canal === 'whatsapp' ? 'WhatsApp (o push do app fica desligado)' : 'App' }),
    item('WhatsApp', { det: esc(ESTADO_WA[w.estado] || w.estado), cls: w.estado === 'caiu' ? 'item--vencido' : '' }),
    item('Webhook da Evolution', { det: esc(w.webhook) }), item('Segredo (cabeçalho x-central-segredo)', { det: esc(w.segredo || '') }))
    + editor('ed-wa', campo('Onde ela fala', 'wc', { opcoes: [['whatsapp', 'WhatsApp'], ['app', 'App']], valor: w.canal, nome: 'canal' })
      + campo('Endereço da Evolution (https://...)', 'wu', { valor: w.url, nome: 'url' }) + campo('Número do Jean (com o país e o DDD)', 'wn', { valor: w.numero, nome: 'numero', extra: ' inputmode="numeric"' }))
    + acoes(botao('Mudar onde ela fala', { leve: true, attrs: ' data-editor="ed-wa" data-wa' }));
}

// WhatsApp (DEC-144): o número de cada pessoa, conectado pelo app (o QR aparece aqui); as conversas dela com terceiros e o
// funil da prospecção, só para olhar. Tudo o que ela faz fora, o Jean pede na conversa.
const ESTADO_NUM = { conectado: 'conectado', caiu: 'caiu', esperando_qr: 'esperando o QR', desligado: 'desconectado', sem_numero: 'sem número' };
const TIPO_FIO = { recado: 'recado', conversa: 'conversa', orcamento: 'orçamento', prospeccao: 'prospecção', parabens: 'agendado' };
function numerosWa(h) {
  if (!h) return '';
  const linha = (n) => {
    const tem = ['conectado', 'caiu', 'esperando_qr'].includes(n.estado);
    const det = [ESTADO_NUM[n.estado] || n.estado, n.numero ? '+' + n.numero : '', n.dias != null ? n.dias + (n.dias === 1 ? ' dia de uso' : ' dias de uso') : ''].filter(Boolean).join(' · ');
    const b = (t, k, extra = {}) => botao(t, { leve: true, ...extra, attrs: ` data-wa-${k}="${esc(n.pessoa_id)}"` });
    return item(esc(n.nome), { det: esc(det), cls: 'item--coluna' + (n.estado === 'caiu' ? ' item--vencido' : ''),
      acao: acoes(tem ? b('Trocar número', 'trocar') : b('Conectar número', 'conectar'), tem ? b('Desconectar', 'desconectar', { perigo: true }) : '', n.estado !== 'sem_numero' ? b('Excluir', 'excluir', { perigo: true }) : '') });
  };
  return '<h2>WhatsApp</h2>' + (h.tem_evolution ? '' : '<p class="texto-2">Preencha o endereço da Evolution em "Onde ela fala" antes de conectar.</p>')
    + lista(...(h.numeros || []).map(linha)) + '<div data-wa-qr></div>'
    + '<p class="pequeno">Só a Pepper responde por enquanto. Cada número novo passa pelo aquecimento: uso de gente, por 1 a 2 semanas.</p>';
}
function foraHtml(h) {
  if (!h) return '';
  const f = (h.funil || []).map((p) => item(esc(p.o_que) + (p.cidade ? ' · ' + esc(p.cidade) : ''), { det: `${p.contatados} contatados · ${p.responderam} responderam · ${p.interessados} interessados · ${p.fechados} fechados` + (p.na_fila ? ` · ${p.na_fila} na fila` : '') }));
  const c = (h.fios || []).map((x) => item(esc(x.com) + ' · ' + esc(TIPO_FIO[x.tipo] || x.tipo), { det: esc(x.resumo || x.ultima || x.objetivo) + ' · ' + esc(x.estado), cls: 'item--coluna',
    acao: acoes(botao('Ver a conversa', { leve: true, attrs: ` data-fio="${Number(x.id)}"` })) }));
  return (f.length ? '<h2>Prospecção</h2>' + lista(...f) : '')
    + '<h2>Conversas com outras pessoas</h2>' + (c.length ? lista(...c) + '<div data-fio-aberto></div>' : '<p class="texto-2">Nenhuma ainda. É só pedir a ela na conversa.</p>');
}
function ligarWa(raiz, ctx) {
  const lugar = () => raiz.querySelector('[data-wa-qr]');
  const erroEm = (e) => { const l = lugar(); if (l) l.innerHTML = '<div class="aviso aviso--erro" role="alert">' + esc(e.message || 'Não deu certo. Tente de novo.') + '</div>'; };
  // O QR se atualiza a cada 4 segundos, até conectar (ou por 3 minutos).
  const mostrarQr = (pessoa_id, r) => {
    const l = lugar(); if (!l) return;
    if (r.estado === 'conectado') { l.innerHTML = '<div class="aviso aviso--certo">Conectado.</div>'; ctx.recarregar(); return; }
    l.innerHTML = (r.qr ? `<img class="qr" src="${esc(r.qr)}" alt="QR Code do WhatsApp">` : '<p class="texto-2">Gerando o QR…</p>')
      + '<p class="texto-2">No celular do chip: WhatsApp › Configurações › Aparelhos conectados › Conectar um aparelho, e aponte para o QR.</p>';
    const fim = Date.now() + 180000;
    const t = setInterval(async () => {
      if (!raiz.isConnected || Date.now() > fim) { clearInterval(t); return; }
      try { const n = await painel('whatsapp', 'qr', { pessoa_id });
        if (n.estado === 'conectado') { clearInterval(t); mostrarQr(pessoa_id, n); }
        else if (n.qr) { const img = raiz.querySelector('[data-wa-qr] .qr'); if (img) img.src = n.qr; else mostrarQr(pessoa_id, n); } }
      catch (e) { /* a próxima tentativa resolve */ }
    }, 4000);
  };
  for (const acao of ['conectar', 'trocar']) aoTocar(raiz, `[data-wa-${acao}]`, async (b) => {
    const pessoa_id = b.getAttribute(`data-wa-${acao}`);
    try { mostrarQr(pessoa_id, await painel('whatsapp', acao, { pessoa_id, webhook_base: endereco() })); } catch (e) { erroEm(e); }
  });
  for (const acao of ['desconectar', 'excluir']) comConfirmacao(raiz, `[data-wa-${acao}]`, async (b) => {
    try { await painel('whatsapp', acao, { pessoa_id: b.getAttribute(`data-wa-${acao}`), confirmado: true }); ctx.recarregar(); } catch (e) { erroEm(e); }
  });
  aoTocar(raiz, '[data-fio]', async (b) => {
    const l = raiz.querySelector('[data-fio-aberto]'); if (!l) return;
    try { const r = await painel('whatsapp', 'fio', { id: Number(b.getAttribute('data-fio')) });
      l.innerHTML = '<h3>A conversa</h3>' + lista(...(r.conversa || []).map((m) => item(m.autor === 'pessoa' ? 'Pepper' : 'Do outro lado', { det: esc(m.texto) + (m.saiu ? '' : ' (ainda não saiu)') })));
      l.scrollIntoView({ block: 'nearest' }); }
    catch (e) { l.innerHTML = '<div class="aviso aviso--erro" role="alert">' + esc(e.message || 'Não deu certo. Tente de novo.') + '</div>'; }
  });
}

const PJ13 = {
  ...P, titulo: 'Sistema',
  carregar: async () => { const d = await painel('sistema'); try { d.wa = await painel('sistema', 'whatsapp'); } catch (e) { d.wa = null; }
    try { d.wh = await painel('whatsapp'); } catch (e) { d.wh = null; } return d; },
  corpo: (d) => ondeFala(d.wa) + numerosWa(d.wh) + foraHtml(d.wh) + '<h2>Serviços</h2>' + lista(...(d.servicos || []).map((s) => item(esc(s.nome), { det: esc(s.estado), cls: s.estado === 'fora' ? 'item--vencido' : '' })))
    + acoes(botao('Fazer backup agora', { principal: true, attrs: ' data-backup' }))
    + '<h2>Testes de personalidade</h2>' + ((d.testes || []).length
      ? lista(...d.testes.map((t) => item(esc(t.nome), { det: esc(t.det), cls: t.passou ? '' : 'item--vencido' })))
      : '<p class="texto-2">Os testes ainda não rodaram.</p>')
    + acoes(botao('Rodar os testes', { leve: true, attrs: ' data-testes' }))
    + '<p class="pequeno">Os testes rodam com a IA de verdade e levam alguns minutos. Toque em Sistema de novo para ver o resultado.</p>',
  depois(raiz, d, ctx) {
    aoTocar(raiz, '[data-backup]', async () => { await painel('sistema', 'fazer_backup_agora'); ctx.recarregar(); });
    comEditor(raiz, '[data-wa]', async (v) => {
      try { await painel('sistema', 'whatsapp', { canal: v.canal, url: v.url, numero: v.numero }); ctx.recarregar(); }
      catch (e) { marcarErro(raiz, 'wu', e.message || 'Não deu certo. Tente de novo.'); }
    });
    aoTocar(raiz, '[data-testes]', async () => { await painel('sistema', 'rodar_testes', { pessoa_id: 'pepper' }); ctx.recarregar(); });
    ligarWa(raiz, ctx);
  },
};

export default { PJ0, PJ1, PJ2, PJ3, PJ4, PJ5, PJ6, PJ7, PJ9, PJ10, PJ12, PJ13 };
