# Central

O app pessoal da Central: a conversa com a Pepper, a captura (foto, áudio e texto, também sem internet), a Vida, a
Agenda, as Finanças e a Pessoa. É um PWA estático publicado pelo GitHub Pages; os dados vêm do servidor, cujo endereço
fica em `config.js`.

- **O app:** `index.html` (na raiz) e `app/` (módulos ES, sem dependências). `sw.js` guarda o app para abrir sem
  internet e recebe os avisos. Para ver com dados inventados, sem servidor: `index.html?demo=1`.
- **O protótipo:** `prototipo/` (todas as telas, de todas as entregas, com dados inventados), gerado por
  `scripts/gerar_prototipo.py`. Os componentes e as cores estão em `assets/design/`.
- **Conferências:** `node scripts/verificar_design.mjs` e `node scripts/jornadas.mjs` (rodam em todo PR).
