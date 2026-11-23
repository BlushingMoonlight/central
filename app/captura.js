// Central — a Captura (K1 foto, K2 áudio, K3 texto) e Recebido (K4), com a fila do aparelho.
import { esc, horaDe, item, lista, botao, acoes, campo, aviso, CARREGANDO, ir, marcarErro } from './ui.js';
import { enviarCaptura, listar as listarFila, ultimoResultado, aoMudar } from './fila.js';
import { segurarParaGravar, blobParaBase64, reduzirFoto } from './midia.js';

const modos = (atual) => '<nav class="modos" aria-label="Tipo de captura">'
  + [['K1', 'Foto'], ['K2', 'Áudio'], ['K3', 'Texto']].map(([c, n]) => `<a href="#${c}"${c === atual ? ' aria-current="page"' : ''}>${n}</a>`).join('')
  + '</nav>';

const SEM_CAMERA = aviso('erro', 'Sem acesso à câmera.', 'Libere em Ajustes do iPhone, Central, Câmera. Áudio e texto continuam funcionando.', 'alert');
const SEM_MICROFONE = aviso('erro', 'Sem acesso ao microfone.', 'Libere em Ajustes do iPhone, Central, Microfone.', 'alert');

async function mandar(raiz, corpo, rotulo) {
  raiz.querySelector('main').innerHTML = '<h1 class="oculto">Capturar</h1>' + CARREGANDO;
  await enviarCaptura(corpo, rotulo);
  ir('K4');
}

const K1 = {
  tipo: 'captura', titulo: 'Capturar',
  corpo: () => modos('K1') + '<div class="camera">A câmera abre ao tocar em “Tirar a foto”. O QR de uma NFC-e é lido primeiro.</div>'
    + '<input id="foto" type="file" accept="image/*" capture="environment" hidden>'
    + acoes(botao('Tirar a foto', { principal: true, largo: true, attrs: ' data-foto' }))
    + '<p class="pequeno">A foto não vai para a galeria e é descartada depois de lida.</p>',
  depois(raiz) {
    const entrada = raiz.querySelector('#foto');
    raiz.querySelector('[data-foto]').addEventListener('click', () => entrada.click());
    entrada.addEventListener('change', async () => {
      const arquivo = entrada.files && entrada.files[0];
      if (!arquivo) return;
      const capturada_em = new Date().toISOString();
      let base64;
      try { base64 = await reduzirFoto(arquivo); } catch (e) {
        raiz.querySelector('.camera').outerHTML = SEM_CAMERA;
        return;
      }
      entrada.value = '';
      await mandar(raiz, { tipo: 'foto', base64, mime: 'image/jpeg', capturada_em }, 'Foto');
    });
  },
};

const K2 = {
  tipo: 'captura', titulo: 'Capturar',
  corpo: () => modos('K2') + '<div class="camera">Segure para gravar. Soltar manda.</div>'
    + acoes(botao('Segurar para gravar', { principal: true, largo: true, attrs: ' data-gravar' }).replace('class="botao', 'class="segurar botao')),
  depois(raiz) {
    segurarParaGravar(raiz.querySelector('[data-gravar]'), async (blob, segundos, mime) => {
      if (!blob.size) return;
      const capturada_em = new Date(Date.now() - segundos * 1000).toISOString();
      const rotulo = `Áudio · ${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
      await mandar(raiz, { tipo: 'audio', base64: await blobParaBase64(blob), mime, duracao: segundos, capturada_em }, rotulo);
    }, () => {
      const c = raiz.querySelector('.camera');
      if (c) c.outerHTML = SEM_MICROFONE;
    });
  },
};

const K3 = {
  tipo: 'captura', titulo: 'Capturar',
  corpo: () => modos('K3') + '<form data-texto>' + campo('O que é', 't', { area: true })
    + acoes(botao('Mandar', { principal: true, largo: true, tipo: 'submit' })) + '</form>',
  depois(raiz, d, ctx) {
    const area = ctx.args[0] || '';
    const f = raiz.querySelector('[data-texto]');
    f.querySelector('#t').focus();
    f.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const texto = f.querySelector('#t').value.trim();
      if (!texto) { marcarErro(raiz, 't', 'Escreva alguma coisa para mandar.'); return; }
      const corpo = { tipo: 'texto', texto, capturada_em: new Date().toISOString() };
      if (area) corpo.area = area;
      await mandar(raiz, corpo, 'Texto');
    });
  },
};

const QUANDO = { Foto: 'tirada às', Texto: 'escrito às' };
const K4 = {
  tipo: 'captura', titulo: 'Recebido',
  carregar: async () => ({ fila: (await listarFila()).filter((i) => i.caminho === 'captura') }),
  corpo(d, args, ctx) {
    const fila = d.fila.length ? '<h2>Na fila do aparelho</h2>' + lista(...d.fila.map((i) => item(esc(i.rotulo),
      { det: (QUANDO[i.rotulo] || 'gravado às') + ' ' + horaDe(i.criada_em), fim: 'esperando' }))) : '';
    let topo;
    if (ultimoResultado === 'erro') topo = aviso('erro', 'Não deu para mandar.', 'Ficou na fila e sobe sozinho.', 'alert');
    else if (ultimoResultado === 'fila' || (d.fila.length && ultimoResultado !== 'recebido')) {
      topo = aviso('atencao', 'Recebido, sem internet.', 'Sobe quando a conexão voltar, com a hora de agora.');
    } else topo = aviso('certo', 'Recebido.', 'A Pepper responde na conversa.');
    return topo + fila + acoes(botao('Voltar', { principal: true, ir: ctx.anterior() }));
  },
  depois(raiz, d, ctx) {
    const sair = aoMudar(() => (ctx.atual() ? ctx.recarregar() : sair()));
  },
};

export default { K1, K2, K3, K4 };
