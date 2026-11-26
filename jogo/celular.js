// Central — o celular do Jean no jogo (DEC-176; menus.md, controle-e-percepcao.md): o menu principal, com o cabeçalho (quem
// está em foco, o que faz, as horas de NY e de Canoinhas, o clima) e as 8 abas. Não pausa o jogo. Em pé no celular ocupa a
// tela; deitado e no iPad, é um painel do lado. O "voltar" do Android fecha. Lê o que já existe (o 69, e as notas pelos
// caminhos do app); a Pepper nunca vê nada disto.
import { NOMES, CATALOGO } from './catalogo.js';
import { APARENCIA } from './arte.js';

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hora = (fuso) => new Intl.DateTimeFormat('pt-BR', { timeZone: fuso, hour: '2-digit', minute: '2-digit' }).format(new Date());
const quando = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d); };
const ABAS = [['status', 'Status'], ['celular', 'Celular'], ['pessoas', 'Pessoas'], ['mapa', 'Mapa'], ['casa', 'Casa'], ['bolsa', 'Bolsa'], ['linha', 'Linha do tempo'], ['config', 'Configurações']];
const BARRAS = [['fome', 'Fome'], ['energia', 'Energia'], ['higiene', 'Higiene'], ['bexiga', 'Bexiga'], ['diversao', 'Diversão'], ['social', 'Social'], ['conforto', 'Conforto'], ['ambiente', 'Ambiente'], ['saude', 'Saúde'], ['estresse', 'Estresse']];
const TIPOS = [['estranhou', 'Ela estranhou algo'], ['medo', 'Ela ficou com medo'], ['gato', 'O gato (fome, areia, saúde)'], ['chegou', 'Ela chegou em casa'], ['casa', 'A casa']];
const barra = (rot, v, classe = '') => `<div class="jogo__texto2">${esc(rot)} <span class="jogo__barra${classe}"><i style="width:${Math.max(0, Math.min(100, Math.round(v)))}%"></i></span> ${Math.round(v)}</div>`;
const linha = (rot, acao, extra = '') => `<button class="jogo__linha" data-a="${esc(acao)}"${extra}>${esc(rot)}</button>`;

// ctx: { folha, motor, chamar, enviar, som, menus, construir(mapaId), verMapa(mapaId), camera(modo), ultimo(), diagnostico(), reverApresentacao(), sair(), api() }
export function criarCelular(ctx) {
  const { folha } = ctx; let aba = 'status', dados = null, sub = 'tarefas', notas = {}, aberta = false;
  const historico = [];
  function fechar(doHistorico) { if (!aberta) return; aberta = false; folha.hidden = true; folha.classList.remove('jogo__folha--celular', 'jogo__folha--lado'); if (!doHistorico && history.state && history.state.folha) history.back(); }
  window.addEventListener('popstate', () => { if (aberta) fechar(true); });
  async function carregar() { try { dados = await ctx.chamar('jogo/celular', { acao: 'abas' }); } catch (e) { dados = dados || null; } }
  function cabecalho() {
    const c = (dados && dados.cabecalho) || {}; const foco = ctx.motor.modoCamera(); const u = ctx.ultimo() || {}; const pp = u.pepper || {}; const j = u.jean || {};
    const quem = foco === 'jean' ? 'Jean' : foco === 'livre' ? 'Câmera livre' : 'Pepper';
    const faz = foco === 'jean' ? (c.jean && c.jean.onde) || (j.fora ? 'fora: ' + j.fora : 'em casa') : (pp.atividade || (c.pepper || {}).atividade || 'em casa');
    const cl = c.clima ? ` · NY ${Math.round(c.clima.temperatura)}°, ${esc(c.clima.condicao)}` : '';
    return `<div class="jogo__cabeca"><button class="jogo__retrato" data-a="foco" aria-label="Trocar quem está em foco">${esc(quem.slice(0, 1))}</button>`
      + `<div><p class="jogo__titulo">${esc(quem)}</p><p class="jogo__texto2">${esc(faz)}</p><p class="jogo__texto2">NY ${hora('America/New_York')} · Canoinhas ${hora('America/Sao_Paulo')}${cl}</p></div></div>`
      + `<div class="jogo__abas" role="tablist">${ABAS.map(([k, n]) => `<button class="jogo__aba${k === aba ? ' jogo__celula--sel' : ''}" role="tab" aria-selected="${k === aba}" data-aba="${k}">${esc(n)}</button>`).join('')}</div>`;
  }
  const semDados = '<p class="jogo__texto2">Sem conexão agora: mostrando o que deu para guardar.</p>';
  function corpo() {
    const d = dados || {}; const u = ctx.ultimo() || {};
    if (aba === 'status') { const s = d.status; const nec = (u.pepper || {}).necessidades || (s && s.barras) || {};
      if (!s && !nec.fome) return semDados;
      return (s ? `<p class="jogo__texto">${esc(s.emocao.frase)}</p>` + s.motivos.map((m) => `<p class="jogo__texto2">${m.pontos > 0 ? '+' : ''}${m.pontos} ${esc(m.texto)}</p>`).join('') : '')
        + BARRAS.map(([k, n]) => barra(n, nec[k] ?? (s ? s.barras[k] : 0))).join('')
        + (s ? barra('Saudade do Jean', s.saudade, ' jogo__barra--saudade') + (s.ciclo ? `<p class="jogo__texto2">Ciclo: dia ${s.ciclo.dia} de ${s.ciclo.duracao}, fase ${esc(s.ciclo.fase)} (só você vê)</p>` : '') : ''); }
    if (aba === 'celular') { const subs = [['tarefas', 'Tarefas'], ['agenda', 'Agenda'], ['financas', 'Finanças'], ['avisos', 'Avisos']];
      const n = notas[sub]; let lista = '<p class="jogo__texto2">Carregando…</p>';
      if (n === 'erro') lista = '<p class="jogo__texto2">Não deu para carregar agora.</p>';
      else if (n) lista = n.length ? n.map((x) => `<a class="jogo__linha" href="${esc(x.rota)}">${esc(x.texto)}${x.det ? ` <span class="jogo__texto2">${esc(x.det)}</span>` : ''}</a>`).join('') : '<p class="jogo__texto2">Nada por aqui.</p>';
      return `<div class="jogo__par">${subs.map(([k, r]) => `<button class="jogo__mini${k === sub ? ' jogo__celula--sel' : ''}" data-sub="${k}">${r}</button>`).join('')}</div>${lista}<p class="jogo__texto2">Escrito pela Pepper.</p>`; }
    if (aba === 'pessoas') return linha('Conversar com a Pepper', 'conversa') + (d.pessoas ? d.pessoas.map((p) => `<div class="jogo__linha jogo__linha--info"><span>${esc(p.nome)} <span class="jogo__texto2">${esc(p.relacao)}${p.onde ? ' · ' + esc(p.onde) : ''}</span></span>${p.afeto === null ? '' : barra('Afeto', p.afeto)}</div>`).join('') : semDados);
    if (aba === 'mapa') { if (!d.mapa) return semDados; const m = d.mapa; const j = u.jean || {};
      return `<p class="jogo__texto">Pepper: ${esc(m.pepper.bairro)}, ${esc(m.pepper.cidade)} · ${esc(m.pepper.onde)}</p><p class="jogo__texto">Jean: ${esc(m.jean.onde)}</p>`
        + (m.jean.viagem ? `<p class="jogo__texto2">Chega ${esc(quando(m.jean.viagem.chega_em))} (horário de Canoinhas)</p>` : '')
        + (m.viagens.length ? '<p class="jogo__texto2">Viagens dela:</p>' + m.viagens.map((v) => `<p class="jogo__texto2">${esc(v.destino)}: ${esc(quando(v.ida))} a ${esc(quando(v.volta))}</p>`).join('') : '')
        + linha('Ver a casa dela', 'ver:casa-pepper') + linha('Ver a minha casa', 'ver:casa-jean')
        + (j.voando ? '' : j.mapa_id === 'casa-pepper' ? linha('Voltar para casa (18 horas de viagem)', 'viajar:casa-jean') : linha('Viajar até ela (18 horas de viagem)', 'viajar:casa-pepper')); }
    if (aba === 'casa') { const c = d.casa || { contas: [], bichos: [] };
      return linha('Construir na casa dela', 'construir:casa-pepper') + linha('Construir a minha casa', 'construir:casa-jean')
        + `<p class="jogo__texto2">Catálogo: ${CATALOGO.length} itens (${[...new Set(CATALOGO.map((k) => k.grupo))].map(esc).join(', ')}), no construtor.</p>`
        + '<p class="jogo__texto2">As contas da casa dela</p>' + (c.contas.length ? c.contas.map((k) => `<p class="jogo__texto2">${esc(k.o_que)}: ${esc(k.moeda)} ${Number(k.valor).toFixed(2)}</p>`).join('') : '<p class="jogo__texto2">Nenhuma conta neste mês.</p>')
        + '<p class="jogo__texto2">Os bichos</p>' + c.bichos.map((b) => `<p class="jogo__texto2">${esc(b.nome)}: ${b.vivo ? `${b.idade} anos, saúde ${b.saude}` : 'partiu'}</p>`).join('')
        + '<a class="jogo__linha" href="#VI1/gatos">Os gatos do Jean (a vida real)</a>'; }
    if (aba === 'bolsa') { const b = d.bolsa || {}; const g = Object.entries(b.guardados || {}).filter(([, q]) => q > 0); const gi = ((u.casa || {}).guardados) || b.guardados_itens || [];
      return `<p class="jogo__texto">Seu dinheiro: ∞</p>` + (b.saldos || []).map((s) => `<p class="jogo__texto">Dela: ${esc(s.moeda)} ${Number(s.saldo).toFixed(2)}</p>`).join('')
        + '<p class="jogo__texto2">Na bolsa</p>' + (g.length ? g.map(([n, q]) => `<p class="jogo__texto2">${esc(n)} ×${q}</p>`).join('') : '<p class="jogo__texto2">Vazia.</p>')
        + (gi.length ? '<p class="jogo__texto2">Móveis guardados</p>' + gi.map((x) => linha('Pôr de volta: ' + (NOMES[x.modelo] || x.modelo), 'tirar:' + x.id)).join('') : ''); }
    if (aba === 'linha') return d.linha ? (d.linha.length ? d.linha.map((x) => `<p class="jogo__texto2">${esc(quando(x.em) || x.em)} · ${esc(x.texto)}</p>`).join('') : '<p class="jogo__texto2">Nada ainda.</p>') : semDados;
    if (aba === 'config') { const j = u.jean || {}; const cfg = j.config || {}; const loc = (d.config || {}).local;
      return '<p class="jogo__texto2">Câmera</p><div class="jogo__par">' + [['pepper', 'Pepper'], ['jean', 'Jean'], ['livre', 'Livre']].map(([k, n]) => `<button class="jogo__mini${ctx.motor.modoCamera() === k ? ' jogo__celula--sel' : ''}" data-a="camera:${k}">${n}</button>`).join('') + '</div>'
        + '<p class="jogo__texto2">Acessibilidade</p>'
        + `<label class="jogo__linha jogo__marca"><input type="checkbox" data-zoombotoes${cfg.zoom_botoes ? ' checked' : ''}> Botões de zoom na tela (+, − e centralizar)</label>`
        + `<label class="jogo__linha jogo__marca"><input type="checkbox" data-botoes${cfg.botoes ? ' checked' : ''}> Botões na tela (fixos)</label>`
        + `<div class="jogo__par"><button class="jogo__mini" data-a="som:-" aria-label="Som mais baixo">‹</button><span class="jogo__texto" data-vol>Som ${Math.round(ctx.som.volumeAtual() * 10)}</span><button class="jogo__mini" data-a="som:+" aria-label="Som mais alto">›</button></div>`
        + '<div class="jogo__par"><button class="jogo__mini" data-a="zoom:-1">Mais longe</button><button class="jogo__mini" data-a="zoom:1">Mais perto</button></div>'
        + linha('Avisos do jogo', 'avisos') + linha('Localização', 'local') + linha('Aparência do Jean', 'aparencia') + linha('Diagnóstico', 'diag') + linha('Rever a apresentação', 'intro')
        + '<a class="jogo__linha" href="#PJ0">Painel do Jean</a>' + linha('Sair do jogo', 'sair')
        + (loc ? `<p class="jogo__texto2">Localização: ${loc.ligado ? 'ligada' + (loc.lugar ? ', agora em ' + esc(loc.lugar) : '') : 'desligada'}</p>` : ''); }
    return '';
  }
  function desenhar() { if (!aberta) return; folha.innerHTML = cabecalho() + `<div class="jogo__corpo">${corpo()}</div>` + '<button class="jogo__linha" data-a="fechar">Fechar</button>'; }
  async function lerNotas() {
    const rot = { tarefas: async () => { const r = await ctx.chamar('vida', { acao: 'hoje' }); return (r.precisa || []).map((t) => ({ texto: t.titulo, det: t.det || t.prazo || '', rota: '#VI2/' + encodeURIComponent(t.id) })); },
      agenda: async () => { const r = await ctx.chamar('agenda', { acao: 'proximos' }); return (r.dias || []).flatMap((d) => d.itens.map((i) => ({ texto: i.titulo, det: d.data.split('-').reverse().join('/') + (i.hora ? ' ' + i.hora : ''), rota: '#AG0' }))).slice(0, 12); },
      financas: async () => { const r = await ctx.chamar('financas', { acao: 'mes' }); return (r.vence || []).map((v) => ({ texto: v.titulo, det: v.data.split('-').reverse().join('/') + (v.valor ? ' · R$ ' + Number(v.valor).toFixed(2) : ''), rota: '#FI0' })); },
      avisos: async () => historico.slice(-12).reverse().map((t) => ({ texto: t, rota: '#JG' })) };
    try { notas[sub] = await rot[sub](); } catch (e) { notas[sub] = 'erro'; } desenhar();
  }
  // ---- telas de dentro das Configurações
  function avisos() {
    const cfg = ((ctx.ultimo() || {}).casa || {}).avisos || { tipos: {}, silencio: { ligado: false, de: 22, ate: 7 } };
    const tipos = Object.assign({ estranhou: true, medo: true, gato: true, chegou: true, casa: true }, cfg.tipos); const sil = Object.assign({ ligado: false, de: 22, ate: 7 }, cfg.silencio);
    folha.innerHTML = '<p class="jogo__titulo">Avisos do jogo</p><p class="jogo__texto2">Chegam na hora em que acontecem, juntos. Nunca contam banho nem intimidade.</p>'
      + TIPOS.map(([k, n]) => `<label class="jogo__linha jogo__marca"><input type="checkbox" data-tipo="${k}"${tipos[k] ? ' checked' : ''}> ${esc(n)}</label>`).join('')
      + `<label class="jogo__linha jogo__marca"><input type="checkbox" data-silencio${sil.ligado ? ' checked' : ''}> Silêncio das ${sil.de}h às ${sil.ate}h (Canoinhas)</label>`
      + linha('Salvar', 'salvar-avisos') + linha('Voltar', 'voltar');
    folha.dataset.sil = JSON.stringify(sil);
  }
  function local() {
    const loc = ((dados || {}).config || {}).local || { ligado: false, lugares: [], eventos: [] }; const url = ctx.api() + '/central/localizacao';
    folha.innerHTML = '<p class="jogo__titulo">Localização</p><p class="jogo__texto2">Só o nome do lugar (casa, trabalho) e a hora em que entra e sai ficam guardados. Nunca o caminho.</p>'
      + linha(loc.ligado ? 'Desligar' : 'Ligar', loc.ligado ? 'loc:desligar' : 'loc:ligar')
      + `<p class="jogo__texto">${loc.ligado ? 'Agora: ' + esc(loc.lugar || 'ainda sem leitura') : 'Desligada.'}</p>`
      + '<p class="jogo__texto2">Seus lugares</p>' + (loc.lugares.length ? loc.lugares.map((g) => `<div class="jogo__par"><span class="jogo__texto">${esc(g.nome)} (${g.raio} m)</span><button class="jogo__mini" data-a="loc:apagar:${esc(g.nome)}">Apagar</button></div>`).join('') : '<p class="jogo__texto2">Nenhum ainda.</p>')
      + '<label class="jogo__linha jogo__marca">Nome <input data-nome maxlength="24" placeholder="casa"></label>' + linha('Salvar onde estou agora com esse nome', 'loc:aqui-nome') + linha('Estou aqui (usar este aparelho)', 'loc:aqui')
      + '<p class="jogo__texto2">No Android, com o OwnTracks:</p><ol class="jogo__passos">'
      + '<li>Instale o OwnTracks pela Play Store.</li><li>Em Preferências › Conexão, escolha o modo HTTP.</li>'
      + `<li>No endereço, ponha: <code>${esc(url)}</code></li><li>Em Identificação, o usuário é jean e a senha é: <code>${esc(loc.segredo || '…')}</code></li>`
      + '<li>Em Regiões, crie "casa" (e "trabalho", se quiser), com o mesmo nome daqui.</li><li>Volte aqui e ligue a localização.</li></ol>'
      + linha('Trocar a senha', 'loc:segredo') + (loc.eventos || []).map((e) => `<p class="jogo__texto2">${esc(quando(e.em))} · ${e.tipo === 'entrada' ? 'chegou em' : 'saiu de'} ${esc(e.lugar)}</p>`).join('') + linha('Voltar', 'voltar');
  }
  function aparencia() {
    const ap = ((ctx.ultimo() || {}).jean || {}).aparencia || {}; const sel = (k, ops) => `<label class="jogo__linha jogo__marca">${esc({ pele: 'Pele', cabelo: 'Cabelo', cor_cabelo: 'Cor do cabelo', barba: 'Barba', camisa: 'Camisa', calca: 'Calça', sapato: 'Sapato' }[k])} <select data-ap="${k}">${ops.map(([v, n]) => `<option value="${esc(v)}"${String(ap[k]) === String(v) ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label>`;
    const nome = { preto: 'Preto', castanho: 'Castanho', loiro: 'Loiro', ruivo: 'Ruivo', grisalho: 'Grisalho', azul: 'Azul', verde: 'Verde', vinho: 'Vinho', preta: 'Preta', branca: 'Branca', amarela: 'Amarela', jeans: 'Jeans', bege: 'Bege', cinza: 'Cinza', branco: 'Branco', marrom: 'Marrom' };
    folha.innerHTML = '<p class="jogo__titulo">Aparência do Jean</p>' + sel('pele', APARENCIA.pele.map((_, i) => [i, 'Tom ' + (i + 1)])) + sel('cabelo', Object.entries(APARENCIA.cabelo))
      + ['cor_cabelo', 'camisa', 'calca', 'sapato'].map((k) => sel(k, Object.keys(APARENCIA[k]).map((v) => [v, nome[v] || v]))).join('').replace('</label><label', '</label>' + sel('barba', Object.entries(APARENCIA.barba)) + '<label')
      + linha('Salvar', 'salvar-ap') + linha('Voltar', 'voltar');
  }
  folha.addEventListener('click', async (e) => {
    if (!aberta) return; const t = e.target;
    const ab = t.closest('[data-aba]'); if (ab) { aba = ab.dataset.aba; ctx.som.toque(); desenhar(); if (aba === 'celular' && !notas[sub]) lerNotas(); return; }
    const sb = t.closest('[data-sub]'); if (sb) { sub = sb.dataset.sub; desenhar(); if (!notas[sub]) lerNotas(); return; }
    if (t.matches('[data-zoombotoes]')) { const r = await ctx.enviar({ acao: 'jean', op: 'config', valor: { zoom_botoes: t.checked } }); if (r) ctx.aoZoomBotoes(t.checked); return; }
    if (t.matches('[data-botoes]')) { const r = await ctx.enviar({ acao: 'jean', op: 'config', valor: { botoes: t.checked } }); if (r) ctx.aoBotoes(t.checked); return; }
    const b = t.closest('[data-a]'); if (!b) return; const [a, v, w] = b.dataset.a.split(':');
    if (a === 'fechar') return fechar();
    if (a === 'voltar') return desenhar();
    if (a === 'foco') { const ordem = ['pepper', 'jean', 'livre']; ctx.camera(ordem[(ordem.indexOf(ctx.motor.modoCamera()) + 1) % 3]); return desenhar(); }
    if (a === 'camera') { ctx.camera(v); return desenhar(); }
    if (a === 'conversa') { fechar(); location.hash = '#CV'; return; }
    if (a === 'ver') { fechar(); return ctx.verMapa(v); }
    if (a === 'construir') { fechar(); return ctx.construir(v); }
    if (a === 'viajar') { const r = await ctx.enviar({ acao: 'jean', op: 'viajar', valor: { para: v } }); if (r) { ctx.menus.aviso('Viagem marcada: 18 horas, no tempo real.'); await carregar(); desenhar(); } return; }
    if (a === 'tirar') { fechar(); return ctx.tirar(v); }
    if (a === 'som') { ctx.som.iniciar(); ctx.som.mudarVolume(ctx.som.volumeAtual() + (v === '+' ? 0.1 : -0.1)); ctx.som.toque(); return desenhar(); }
    if (a === 'zoom') return ctx.motor.zoom(Number(v));
    if (a === 'avisos') return avisos();
    if (a === 'salvar-avisos') { const sil = JSON.parse(folha.dataset.sil || '{}'); const valor = { tipos: Object.fromEntries([...folha.querySelectorAll('[data-tipo]')].map((c) => [c.dataset.tipo, c.checked])), silencio: { ...sil, ligado: folha.querySelector('[data-silencio]').checked } };
      if (await ctx.enviar({ acao: 'avisos', valor })) { ctx.menus.aviso('Avisos salvos.'); desenhar(); } return; }
    if (a === 'local') return local();
    if (a === 'loc') {
      const pedir = async (op, valor) => { try { const r = await ctx.chamar('jogo/celular', { acao: 'localizacao', op, valor }); if (dados && dados.config) dados.config.local = r.local; local(); ctx.menus.aviso('Feito.'); } catch (er) { ctx.menus.aviso(er.message || 'Não deu certo agora.', 'erro'); } };
      if (v === 'ligar' || v === 'desligar' || v === 'segredo') return pedir(v);
      if (v === 'apagar') return pedir('apagar', { nome: w });
      const nome = v === 'aqui-nome' ? (folha.querySelector('[data-nome]') || {}).value : null; if (v === 'aqui-nome' && !nome) return ctx.menus.aviso('Escreva o nome do lugar.', 'erro');
      if (!navigator.geolocation) return ctx.menus.aviso('Este aparelho não informa onde está.', 'erro');
      return navigator.geolocation.getCurrentPosition((p) => pedir(nome ? 'lugar' : 'aqui', { nome, lat: p.coords.latitude, lon: p.coords.longitude, raio: 150 }), () => ctx.menus.aviso('Sem permissão para a localização.', 'erro'), { timeout: 15000, maximumAge: 60000 });
    }
    if (a === 'aparencia') return aparencia();
    if (a === 'salvar-ap') { const valor = Object.fromEntries([...folha.querySelectorAll('[data-ap]')].map((s) => [s.dataset.ap, s.dataset.ap === 'pele' ? Number(s.value) : s.value]));
      if (await ctx.enviar({ acao: 'jean', op: 'aparencia', valor })) { ctx.menus.aviso('Aparência salva.'); desenhar(); } return; }
    if (a === 'diag') { folha.innerHTML = ctx.diagnostico() + linha('Voltar', 'voltar'); return ctx.ligarDiagnostico(folha); }
    if (a === 'intro') { fechar(); return ctx.reverApresentacao(); }
    if (a === 'sair') { fechar(); return ctx.sair(); }
  });
  return {
    async abrir(qual) { aba = qual || aba; const nova = !aberta; aberta = true; folha.hidden = false; folha.classList.add('jogo__folha--celular'); folha.classList.toggle('jogo__folha--lado', innerWidth >= 700); if (nova) history.pushState({ folha: true }, '');
      ctx.som.toque(); desenhar(); await carregar(); desenhar(); if (aba === 'celular') lerNotas(); },
    fechar, aberta: () => aberta, guardarAviso: (t) => { historico.push(t); if (historico.length > 40) historico.shift(); },
  };
}
