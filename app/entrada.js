// Central — a entrada: primeiro acesso (passo-1, passo-4 a passo-7), entrar (com código no aparelho novo) e esqueci a
// senha. Sem token, o app cai aqui. As telas de entrada não pedem sessão.
import { chamar, gravarToken, aparelho, modoDemo } from './api.js';
import { esc, botao, acoes, campo, aoTocar, ir, marcarErro } from './ui.js';
import { ligarAvisos } from './midia.js';

// O que a pessoa já disse neste fluxo (só na memória da página).
const fluxo = { tipo: 'primeiro', email: '', codigo: '' };
// "Mandar outro código" só depois de 60 segundos do último envio (o servidor confere também).
function esperar(b) {
  if (!b) return;
  b.disabled = true;
  setTimeout(() => { b.disabled = false; }, modoDemo ? 0 : 60000);
}
const caminho = () => (fluxo.tipo === 'esqueci' ? 'esqueci' : 'primeiro-acesso');

const PASSO = { tipo: 'entrada' };
const erroTexto = (e, padrao) => (e && e.tipo === 'servidor' && e.message ? e.message : e && e.tipo === 'rede' ? 'Não deu para carregar. Confira a internet e tente de novo.' : padrao);

function form(raiz, fn) {
  const f = raiz.querySelector('form');
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const b = f.querySelector('[type=submit]');
    if (b && b.getAttribute('aria-disabled') === 'true') return;
    b && b.setAttribute('aria-disabled', 'true');
    try { await fn(f); } finally { b && b.removeAttribute('aria-disabled'); }
  });
}

const passo1 = {
  ...PASSO, titulo: 'Instalar',
  corpo: () => '<h1>Ponha a Central na Tela de Início</h1>'
    + '<ol class="lista"><li class="item">1. Toque em Compartilhar.</li><li class="item">2. Toque em “Adicionar à Tela de Início”.</li>'
    + '<li class="item">3. Toque em “Adicionar” e abra a Central por lá.</li></ol>'
    + '<p class="pequeno">É lá que os avisos funcionam.</p>' + acoes(botao('Já instalei', { ir: 'passo-4', leve: true })),
};

const passo4 = {
  ...PASSO, titulo: 'Entrar',
  corpo: () => '<form><h1>Entrar na Central</h1>' + campo('E-mail', 'em', { tipo: 'email', valor: fluxo.email, extra: ' autocomplete="email" required' })
    + acoes(botao('Mandar código', { principal: true, tipo: 'submit' })) + '</form>',
  depois(raiz) {
    form(raiz, async (f) => {
      const email = f.querySelector('#em').value.trim();
      try {
        await chamar('primeiro-acesso', { etapa: 'email', email });
        Object.assign(fluxo, { tipo: 'primeiro', email });
        ir('passo-5');
      } catch (e) { marcarErro(raiz, 'em', erroTexto(e, 'Este e-mail não tem conta na Central.')); }
    });
  },
};

const passo5 = {
  ...PASSO, titulo: 'Código',
  corpo: () => '<form><h1>O código</h1><p class="texto-2">Mandamos 6 números para o seu e-mail. Valem 10 minutos.</p>'
    + campo('Código', 'cd', { extra: ' inputmode="numeric" autocomplete="one-time-code" maxlength="6"' })
    + acoes(botao('Mandar outro código', { leve: true, attrs: ' data-outro' })) + '</form>',
  depois(raiz) {
    if (!fluxo.email && !modoDemo) { ir(fluxo.tipo === 'esqueci' ? 'esqueci' : 'passo-4'); return; }
    const cd = raiz.querySelector('#cd');
    const outro = raiz.querySelector('[data-outro]');
    cd.focus();
    esperar(outro);
    const conferir = async () => {
      const codigo = cd.value.replace(/\D/g, '');
      if (codigo.length !== 6) return;
      try {
        await chamar(caminho(), { etapa: 'codigo', email: fluxo.email, codigo });
        fluxo.codigo = codigo;
        ir('passo-6');
      } catch (e) {
        marcarErro(raiz, 'cd', erroTexto(e, 'Código errado. Use o código do e-mail mais recente.'));
        outro.classList.replace('botao--leve', 'botao--principal');
      }
    };
    cd.addEventListener('input', conferir);
    form(raiz, conferir);
    aoTocar(raiz, '[data-outro]', async () => {
      await chamar(caminho(), { etapa: 'email', email: fluxo.email, reenviar: true });
      esperar(outro);
      cd.value = '';
      marcarErro(raiz, 'cd', '');
      outro.classList.replace('botao--principal', 'botao--leve');
      cd.focus();
    });
  },
};

const passo6 = {
  ...PASSO, titulo: 'Senha',
  corpo: () => '<form><h1>Crie a senha</h1>' + campo('Senha', 'sn', { tipo: 'password', extra: ' autocomplete="new-password"' })
    + '<p class="pequeno">12 caracteres ou mais.</p>' + acoes(botao('Continuar', { principal: true, tipo: 'submit' })) + '</form>',
  depois(raiz) {
    if (!fluxo.codigo && !modoDemo) { ir(fluxo.tipo === 'esqueci' ? 'esqueci' : 'passo-4'); return; }
    form(raiz, async (f) => {
      const senha = f.querySelector('#sn').value;
      if (senha.length < 12) { marcarErro(raiz, 'sn', 'A senha precisa de 12 caracteres ou mais.'); return; }
      try {
        const r = await chamar(caminho(), { etapa: 'senha', email: fluxo.email, codigo: fluxo.codigo, senha, aparelho: aparelho() });
        gravarToken(r.token);
        const tipo = fluxo.tipo;
        Object.assign(fluxo, { email: '', codigo: '' });
        ir(tipo === 'esqueci' ? 'CV' : 'passo-7');
      } catch (e) { marcarErro(raiz, 'sn', erroTexto(e, 'Código errado ou vencido.')); }
    });
  },
};

const passo7 = {
  ...PASSO, titulo: 'Avisos',
  corpo: () => '<h1>Ligar os avisos</h1><p class="texto-2">Na tela bloqueada aparece só “Nova mensagem”. Dá para mudar em Ajustes.</p>'
    + acoes(botao('Ligar os avisos', { principal: true, attrs: ' data-ligar' }), botao('Agora não', { ir: 'CV', leve: true })),
  depois(raiz) {
    raiz.querySelector('[data-ligar]').addEventListener('click', async () => {
      try { await ligarAvisos(); } catch (e) { /* segue: dá para ligar depois em Ajustes, Avisos */ }
      ir('CV');
    });
  },
};

let precisaCodigo = false;
const entrar = {
  ...PASSO, titulo: 'Entrar',
  corpo: () => '<form><h1>Entrar</h1><div data-aviso></div>' + campo('E-mail', 'e1', { tipo: 'email', extra: ' autocomplete="email"' })
    + campo('Senha', 's1', { tipo: 'password', extra: ' autocomplete="current-password"' })
    + '<div data-codigo hidden><p class="texto-2">Aparelho novo. Mandamos 6 números para o seu e-mail. Valem 10 minutos.</p>'
    + campo('Código', 'c1', { extra: ' inputmode="numeric" autocomplete="one-time-code" maxlength="6"' })
    + acoes(botao('Mandar outro código', { leve: true, attrs: ' data-outro' })) + '</div>'
    + acoes(botao('Entrar', { principal: true, tipo: 'submit' }), botao('Esqueci a senha', { ir: 'esqueci', leve: true })) + '</form>',
  depois(raiz) {
    precisaCodigo = false;
    form(raiz, async (f) => {
      const corpo = { email: f.querySelector('#e1').value.trim(), senha: f.querySelector('#s1').value, aparelho: aparelho() };
      if (precisaCodigo) corpo.codigo = f.querySelector('#c1').value.replace(/\D/g, '');
      try {
        const r = await chamar('entrar', corpo);
        if (r.precisa_codigo) {
          if (!precisaCodigo) esperar(raiz.querySelector('[data-outro]'));
          precisaCodigo = true;
          raiz.querySelector('[data-codigo]').hidden = false;
          raiz.querySelector('#c1').focus();
          return;
        }
        gravarToken(r.token);
        ir('CV');
      } catch (e) {
        raiz.querySelector('[data-aviso]').innerHTML = '<div class="aviso aviso--erro" role="alert">'
          + esc(erroTexto(e, 'E-mail ou senha errados. Depois de 5 tentativas, a entrada fica bloqueada por 15 minutos.')) + '</div>';
      }
    });
    aoTocar(raiz, '[data-outro]', async () => {
      const f = raiz.querySelector('form');
      try {
        await chamar('entrar', { email: f.querySelector('#e1').value.trim(), senha: f.querySelector('#s1').value, aparelho: aparelho(), reenviar: true });
        esperar(raiz.querySelector('[data-outro]'));
        raiz.querySelector('[data-aviso]').innerHTML = '<div class="aviso aviso--certo" role="status">Mandamos outro código. Use o do e-mail mais recente.</div>';
      } catch (e) {
        raiz.querySelector('[data-aviso]').innerHTML = '<div class="aviso aviso--erro" role="alert">' + esc(erroTexto(e, 'Não deu para mandar o código. Tente de novo.')) + '</div>';
      }
    });
  },
};

const esqueci = {
  ...PASSO, titulo: 'Esqueci a senha', voltar: ['entrar', 'Entrar'],
  corpo: () => '<form><h1>Esqueci a senha</h1><p class="texto-2">Mandamos um código ao e-mail da conta. Com ele, você cria a senha nova, '
    + 'e os outros aparelhos saem.</p>' + campo('E-mail', 'e3', { tipo: 'email', extra: ' autocomplete="email"' })
    + acoes(botao('Mandar código', { principal: true, tipo: 'submit' })) + '</form>',
  depois(raiz) {
    form(raiz, async (f) => {
      const email = f.querySelector('#e3').value.trim();
      try {
        await chamar('esqueci', { etapa: 'email', email });
        Object.assign(fluxo, { tipo: 'esqueci', email, codigo: '' });
        ir('passo-5');
      } catch (e) { marcarErro(raiz, 'e3', erroTexto(e, 'Este e-mail não tem conta na Central.')); }
    });
  },
};

export default { 'passo-1': passo1, 'passo-4': passo4, 'passo-5': passo5, 'passo-6': passo6, 'passo-7': passo7, entrar, esqueci };
