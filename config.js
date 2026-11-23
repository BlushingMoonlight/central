// Central — o endereço do servidor. O Jean (ou a Action de publicação) põe aqui o endereço do n8n, no formato
// https://<servidor>/webhook/central (sem barra no fim). Nenhuma chave entra aqui: o app só guarda o token da sessão
// no aparelho. Sem endereço, o app mostra "Não deu para carregar." (o modo de demonstração, ?demo=1, não precisa dele).
window.CENTRAL = { api: '' };
