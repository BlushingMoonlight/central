// Central — Ajustes (AJ0), Avisos (AJ1), Entrada e aparelhos (AJ2) e Instalar (AJ3).
import { chamar, gravarToken, papel } from './api.js';
import { esc, data, item, lista, botao, acoes, campo, editor, aoTocar, comEditor, comConfirmacao, ir, marcarErro } from './ui.js';
import { suportaAvisos, avisosLigados, ligarAvisos } from './midia.js';

const aparelho = (acao, extra = {}) => chamar('aparelho', { acao, ...extra });

const AJ0 = {
  tipo: 'filho', titulo: 'Ajustes', voltar: ['JG/config', 'Configurações'],
  // O app é o jogo (DEC-199): estes ajustes também estão nas Configurações do celular; o painel, só para o administrador.
  corpo: () => lista(item('Avisos', { ir: 'AJ1' }), item('Entrada e aparelhos', { ir: 'AJ2' }), item('Instalar', { ir: 'AJ3' }),
    ...(papel() === 'administrador' ? [item('Painel do Jean', { ir: 'PJ0' })] : [])),
};

const AJ1 = {
  tipo: 'filho', titulo: 'Avisos', voltar: ['JG/config', 'Configurações'],
  carregar: async () => ({ ...(await aparelho('listar')), ligados: await avisosLigados(), suporta: suportaAvisos() }),
  corpo(d) {
    const topo = !d.suporta ? '<p class="texto-2">Os avisos só chegam com a Central na Tela de Início.</p>' + acoes(botao('Instalar', { ir: 'AJ3', leve: true }))
      : d.ligados ? '<p class="texto-2">Os avisos estão ligados neste aparelho.</p>'
        : '<p class="texto-2">Os avisos estão desligados neste aparelho.</p>' + acoes(botao('Ligar os avisos', { principal: true, attrs: ' data-ligar' }));
    return topo + '<h2>Na tela bloqueada</h2>'
      + `<label class="marca"><input type="radio" name="texto" value="nao"${d.mostrar_texto ? '' : ' checked'}> Só “Nova mensagem”</label>`
      + `<label class="marca"><input type="radio" name="texto" value="sim"${d.mostrar_texto ? ' checked' : ''}> Mostrar o texto</label>`;
  },
  depois(raiz, d, ctx) {
    aoTocar(raiz, '[data-ligar]', async () => { await ligarAvisos(); ctx.recarregar(); });
    raiz.querySelectorAll('input[name=texto]').forEach((r) => r.addEventListener('change', () => {
      aparelho('mostrar_texto', { sim: r.value === 'sim' }).catch(() => ctx.recarregar());
    }));
  },
};

const AJ2 = {
  tipo: 'filho', titulo: 'Entrada e aparelhos', voltar: ['JG/config', 'Configurações'],
  carregar: () => aparelho('listar'),
  corpo: (d) => lista(...(d.aparelhos || []).map((a) => item(esc(a.nome), {
    det: a.este ? 'este aparelho' + (a.lembrado_ate ? ' · lembrado até ' + data(a.lembrado_ate, true) : '') : 'último uso ' + data(a.ultimo_uso, true) })))
    + editor('ed-senha', campo('Senha atual', 'sa', { tipo: 'password', nome: 'atual', extra: ' autocomplete="current-password"' })
      + campo('Senha nova', 'sn', { tipo: 'password', nome: 'nova', extra: ' autocomplete="new-password"' }) + '<p class="pequeno">12 caracteres ou mais.</p>')
    + acoes(botao('Trocar a senha', { principal: true, attrs: ' data-editor="ed-senha" data-senha' }), botao('Sair', { leve: true, attrs: ' data-sair' }))
    + '<div class="perigoso">' + acoes(botao('Sair de todos os aparelhos', { perigo: true, attrs: ' data-todos' })) + '</div>',
  depois(raiz, d, ctx) {
    comEditor(raiz, '[data-senha]', async (v) => {
      if (v.nova.length < 12) { marcarErro(raiz, 'sn', 'A senha precisa de 12 caracteres ou mais.'); return; }
      await aparelho('trocar_senha', { atual: v.atual, nova: v.nova });
      ctx.recarregar();
    });
    const sair = async (acao) => { try { await aparelho(acao); } finally { gravarToken(''); ir('entrar'); } };
    aoTocar(raiz, '[data-sair]', () => sair('sair'));
    comConfirmacao(raiz, '[data-todos]', () => sair('sair_todos'));
  },
};

const AJ3 = {
  tipo: 'filho', titulo: 'Instalar', voltar: ['JG/config', 'Configurações'],
  corpo: () => '<ol class="lista"><li class="item">1. No Safari, toque em Compartilhar.</li><li class="item">2. Toque em “Adicionar à Tela de Início”.</li>'
    + '<li class="item">3. Toque em “Adicionar”.</li></ol><p class="pequeno">Os avisos só chegam com a Central na Tela de Início.</p>',
};

export default { AJ0, AJ1, AJ2, AJ3 };
