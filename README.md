# Central

O app pessoal da Central. Desde a rodada 9, parte I, abrir o app é cair no jogo (a casa dela), e cada tela abaixo é um app do celular do jogo: a conversa com a Pepper, a captura (foto, áudio e texto, também sem internet), a Vida, a
Agenda, as Finanças e a Pessoa. É um PWA estático publicado pelo GitHub Pages; os dados vêm do servidor, cujo endereço
fica em `config.js`.

- **O app:** `index.html` (na raiz) e `app/` (módulos ES, sem dependências). `sw.js` guarda o app para abrir sem
  internet e recebe os avisos. Para ver com dados inventados, sem servidor: `index.html?demo=1`.
- **O protótipo:** `prototipo/` (todas as telas, de todas as entregas, com dados inventados), gerado por
  `scripts/gerar_prototipo.py`. Os componentes e as cores estão em `assets/design/`.
- **Conferências:** `node scripts/verificar_design.mjs` e `node scripts/jornadas.mjs` (rodam em todo PR).
- **O app no jogo:** `node scripts/testar_app_jogo.mjs` (cada tela antiga dentro do jogo, a entrada, a exportação, o QR, o jogador comum, a ficha, a abertura e o WebGL; roda em todo PR). Os ícones: `python3 scripts/gerar_icones.py [janela|casinha|abajur]`.
- **O jogo:** `node scripts/testar_rotina.mjs` (a rotina dela: a rota, o desvio, a Morgan, as visitas e os sentidos; roda em
  todo PR), `node scripts/testar_jean.mjs` (o boneco do Jean sai pelas portas; roda em todo PR), `node scripts/testar_abertura.mjs` e
  `node scripts/testar_camera.mjs`.
- **A parte J (a criação de personagem, a construção, o toque e o visual vivo):** `node scripts/testar_boneco.mjs` (sem navegador: o boneco em camadas,
  a genética, a idade, a roupa do dia, as regras do construtor, a vista, a música e o som) e `node scripts/testar_toque.mjs` (o menu em círculo, o toque
  longo, o construtor, o criador, o desempenho e a comparação de resolução em `prototipo/resolucao/`). Rodam em todo PR.
