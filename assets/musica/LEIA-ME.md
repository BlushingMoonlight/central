# A música do jogo (as camadas)

Enquanto esta pasta não tem faixas, o jogo toca a trilha provisória, gerada por código (`jogo/musica.js`).

Para pôr as faixas do Suno: baixe os stems (as camadas) de cada faixa, ponha os arquivos aqui e liste em `faixas.json`:

```json
{ "noite": { "base": "noite-base.mp3", "harmonia": "noite-harmonia.mp3", "melodia": "noite-melodia.mp3", "percussao": "noite-percussao.mp3", "ambiente": "noite-ambiente.mp3" } }
```

As faixas são `manha`, `tarde`, `noite`, `madrugada` e `casa_jean`. Todas as camadas de uma faixa precisam ter o mesmo
tamanho (elas tocam juntas e repetem juntas). A lista dos temas e o texto para o Suno estão com o revisor.
