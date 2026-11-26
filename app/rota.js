// Central — a leitura da rota (#CÓDIGO ou #CÓDIGO/id). Sem DOM: o scripts/verificar_design.mjs testa direto.
// O id de um item tem barras ("areas/documentos/tarefas/x"). Codificado (%2F) ou não (o Safari pode entregar o hash já
// decodificado), tudo depois da primeira barra é um id só: nenhuma tela usa dois argumentos (DEC-129, DEC-140).
export function lerRota(hash, telas) {
  const h = String(hash || '').replace(/^#/, ''); const barra = h.indexOf('/');
  const cod = barra < 0 ? h : h.slice(0, barra);
  // Sem código conhecido (ou sem nada), abre o jogo: o app é o jogo (DEC-199).
  if (!telas[cod]) return { cod: 'JG', args: [] };
  if (barra < 0) return { cod, args: [] };
  const resto = h.slice(barra + 1); let id = resto;
  try { id = decodeURIComponent(resto); } catch (e) { id = resto; }
  return { cod, args: id ? [id] : [] };
}
