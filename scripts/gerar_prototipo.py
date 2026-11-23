#!/usr/bin/env python3
"""Gera o protótipo da Central (prototipo/**.html) a partir das telas abaixo.

O que faz: escreve uma página por tela da árvore (docs/fluxo/arvore.md do central-sistema), com os estados
(normal, vazio, erro, carregando e, onde existe, outros), a barra do protótipo e o mapa (prototipo/index.html).
Só dados inventados. Cor, tamanho e espaço vêm de assets/design/tokens.css, pelas classes de componentes.css.

Como rodar: python3 scripts/gerar_prototipo.py   (depois: node scripts/verificar_design.mjs)
Nunca edite os .html de prototipo/ à mão: mude aqui e gere de novo.
"""
import os, html

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "prototipo")
TELAS = {}   # código -> dados
ORDEM = []

SECOES = [("CV", "Conversa"), ("VI0", "Vida"), ("AG0", "Agenda"), ("FI0", "Finanças"), ("PE1", "Pessoas")]
PASTA = {"CV": "conversa", "K": "captura", "VI": "vida", "AG": "agenda", "FI": "financas", "PE": "pessoas",
         "AJ": "ajustes", "PJ": "painel", "passo": "entrada", "entrar": "entrada", "esqueci": "entrada"}


def pasta(cod):
    for p in ("passo", "entrar", "esqueci", "CV", "VI", "AG", "FI", "PE", "AJ", "PJ", "K"):
        if cod.startswith(p):
            return PASTA[p]


def arquivo(cod):
    return cod.lower() + ".html"


def href(cod, estado=None):
    return f"../{pasta(cod)}/{arquivo(cod)}" + (f"?estado={estado}" if estado else "")


def tela(cod, titulo, *, tipo="filho", pai=None, secao=None, entrega=1, sub="", estados=None, extra=""):
    """tipo: primeiro, filho, passo, captura, painel. estados: {nome: html}."""
    TELAS[cod] = dict(titulo=titulo, tipo=tipo, pai=pai, secao=secao, entrega=entrega, sub=sub, estados=estados, extra=extra)
    ORDEM.append(cod)


# ---------- pedaços ----------
def e(t):
    return html.escape(t, quote=False)


def data(d, curto=False):
    return f'<span data-data="{d}"{" data-formato=\"curto\"" if curto else ""}></span>'


def item(titulo, det="", fim="", ir=None, cls="", acao=""):
    tag_a = f'<a class="item {cls}" href="{href(ir)}">' if ir else f'<div class="item {cls}">'
    fecha = "</a>" if ir else "</div>"
    return (f'<li>{tag_a}<span class="item__texto"><strong>{titulo}</strong>'
            + (f'<span class="item__det">{det}</span>' if det else "") + "</span>"
            + (f'<span class="item__fim">{fim}</span>' if fim else "") + acao + fecha + "</li>")


def lista(*itens):
    return '<ul class="lista">' + "".join(itens) + "</ul>"


def botao(texto, ir=None, principal=False, leve=False, perigo=False, largo=False, extra=""):
    cls = "botao" + (" botao--principal" if principal else "") + (" botao--leve" if leve else "") \
          + (" botao--perigo" if perigo else "") + (" botao--largo" if largo else "")
    if ir:
        return f'<a class="{cls}" href="{href(ir) if not ir.startswith("?") and not ir.startswith("#") else ir}"{extra}>{texto}</a>'
    return f'<button class="{cls}" type="button"{extra}>{texto}</button>'


def acoes(*b):
    return '<div class="acoes">' + "".join(b) + "</div>"


def campo(rot, id_, tipo="text", valor="", erro="", area=False, extra=""):
    v = f' value="{valor}"' if valor else ""
    ctl = (f'<textarea id="{id_}" rows="3"{extra}>{valor}</textarea>' if area
           else f'<input id="{id_}" type="{tipo}"{v}{extra}>')
    return (f'<div class="campo{" campo--erro" if erro else ""}"><label for="{id_}">{rot}</label>{ctl}'
            + (f'<span class="campo__erro">{erro}</span>' if erro else "") + "</div>")


def vazio(titulo, texto="", principal=None):
    return f'<div class="vazio"><strong>{titulo}</strong>{texto}</div>' + (acoes(principal) if principal else "")


CARREGANDO = ('<div class="carregando" role="status" aria-label="Carregando"><span></span><span></span><span></span></div>'
              '<p class="pequeno">Carregando…</p>')
ERRO = ('<div class="aviso aviso--erro" role="alert"><strong>Não deu para carregar.</strong> Confira a internet e tente '
        'de novo.</div>' + acoes('<a class="botao botao--principal" href="?estado=normal">Tentar de novo</a>'))


def padrao(normal, v=None):
    d = {"normal": normal}
    if v is not None:
        d["vazio"] = v
    d["erro"] = ERRO
    d["carregando"] = CARREGANDO
    return d


def msg(quem, texto, hora=None, visto=False):
    fim = " msg--fim" if hora else ""
    h = f'<span class="hora">{hora}{" · visto" if visto else ""}</span>' if hora else ""
    return f'<div class="msg msg--{quem}{fim}"><p>{texto}</p>{h}</div>'


# ---------- Conversa ----------
CONVERSA = (
    '<div class="acoes"><a class="botao botao--leve" href="' + href("CV1") + '">Buscar</a>'
    '<a class="botao botao--leve" href="' + href("CV3") + '">Combinados</a></div>'
    '<p class="dia">' + data("2026-11-23") + "</p>"
    + msg("ela", "bom dia") + msg("ela", "o darf vence hoje")
    + msg("ela", "paga até as 18h? senão eu fico chata", "08:12")
    + '<p class="sistema">Tarefa criada em Finanças: pagar o DARF, vence hoje. <a href="#">Desfazer</a></p>'
    + msg("ele", "pago depois do almoço", "08:30", True) + msg("ela", "ok", "08:31")
    + msg("ele", "o que você está fazendo?", "09:38", True)
    + msg("ela", "levando a morgan na escola") + msg("ela", "trânsito parado. e vc?", "09:41")
    + '<div class="msg msg--ela msg--audio msg--fim"><p><button class="botao botao--leve" type="button">Ouvir</button>'
      'áudio · 0:14</p><span class="hora">09:44</span></div>'
    + msg("ele", "paguei o darf", "13:05", True)
)
PROPOSTA_CV = ('<div class="proposta"><p><strong>Marcar o DARF como pago?</strong> R$ 1.240,00, pago hoje.</p>'
               + acoes(botao("Aceitar", "CV"), botao("Mudar", "CV2", leve=True), botao("Recusar", "CV", leve=True)) + "</div>")
tela("CV", "Pepper", tipo="primeiro", secao="CV", sub="visto por último às 13:06", estados={
    "normal": CONVERSA + PROPOSTA_CV,
    "vazio": vazio("A conversa começa aqui.", " A Pepper manda a primeira mensagem quando a Central ligar."),
    "erro": CONVERSA.split('<div class="msg msg--ele msg--fim"><p>paguei')[0]
            + '<div class="msg msg--ele msg--fim"><p>paguei o darf</p><span class="hora">Não enviada · sem conexão</span></div>'
            + '<p class="sistema">Sem conexão. A mensagem sai quando a internet voltar. <a href="?estado=normal">Tentar agora</a></p>',
    "carregando": CARREGANDO,
}, extra="conversa")

tela("CV1", "Buscar", pai="CV", secao="CV", estados=padrao(
    campo("Buscar na conversa, na memória e na Vida", "b", valor="dentista")
    + acoes(botao("Buscar", principal=True)) + "<h2>3 resultados</h2>"
    + lista(item("“a consulta do dentista ficou para o dia 4”", "Conversa · " + data("2026-11-12", True)),
            item("Dentista: limpeza", "Agenda · " + data("2026-12-04"), ir="AG1"),
            item("Marcar o dentista da família", "Vida · Saúde · feita", ir="VI2")),
    campo("Buscar na conversa, na memória e na Vida", "b2", valor="passaporte") + acoes(botao("Buscar", principal=True))
    + vazio("Nada encontrado para “passaporte”.", " Dá para perguntar à Pepper também.")))

tela("CV2", "Proposta", tipo="passo", pai="CV", estados=padrao(
    "<h1>Marcar o DARF como pago?</h1>"
    + lista(item("O quê", "O DARF de R$ 1.240,00, que vencia hoje, fica como pago."),
            item("Por quê", "Você disse na conversa que pagou."),
            item("Depois", "A tarefa sai de “Precisa de você hoje” e fica em Feitas."))
    + acoes(botao("Aceitar", "CV", principal=True), botao("Mudar o valor", leve=True), botao("Recusar", "CV", leve=True)),
    vazio("Nenhuma proposta esperando.", "", botao("Voltar à conversa", "CV"))))

tela("CV3", "Combinados", pai="CV", secao="CV", estados=padrao(
    "<p class=\"texto-2\">O que você e a Pepper combinaram. Desfazer um combinado avisa a ela.</p>"
    + lista(item("Não falar mais da viagem de março", "desde " + data("2026-11-10", True), acao=botao("Desfazer", principal=True)),
            item("Lembrar da água às 15h", "desde " + data("2026-11-02", True), acao=botao("Desfazer", leve=True))),
    vazio("Nenhum combinado ainda.", " Quando vocês combinarem algo na conversa, aparece aqui.")))

# ---------- Captura ----------
def modos(atual):
    return ('<nav class="modos" aria-label="Tipo de captura">'
            + "".join(f'<a href="{href(c)}"{" aria-current=\"page\"" if c == atual else ""}>{n}</a>'
                      for c, n in (("K1", "Foto"), ("K2", "Áudio"), ("K3", "Texto"))) + "</nav>")


SEM_CAMERA = ('<div class="aviso aviso--erro" role="alert"><strong>Sem acesso à câmera.</strong> Libere em Ajustes do iPhone, '
              'Central, Câmera. Áudio e texto continuam funcionando.</div>')
tela("K1", "Capturar", tipo="captura", estados={
    "normal": modos("K1") + '<div class="camera">A câmera aparece aqui. O QR de uma NFC-e é lido primeiro.</div>'
              + acoes(botao("Tirar a foto", "K4", principal=True, largo=True))
              + '<p class="pequeno">A foto não vai para a galeria e é descartada depois de lida.</p>',
    "erro": modos("K1") + SEM_CAMERA, "carregando": modos("K1") + CARREGANDO})
tela("K2", "Capturar", tipo="captura", estados={
    "normal": modos("K2") + '<div class="camera">Segure para gravar. Soltar manda.</div>'
              + acoes(botao("Segurar para gravar", "K4", principal=True, largo=True)),
    "erro": modos("K2") + '<div class="aviso aviso--erro" role="alert"><strong>Sem acesso ao microfone.</strong> Libere em '
              'Ajustes do iPhone, Central, Microfone.</div>', "carregando": modos("K2") + CARREGANDO})
tela("K3", "Capturar", tipo="captura", estados={
    "normal": modos("K3") + campo("O que é", "t", area=True) + acoes(botao("Mandar", "K4", principal=True, largo=True)),
    "erro": modos("K3") + campo("O que é", "t2", area=True, erro="Escreva alguma coisa para mandar."),
    "carregando": modos("K3") + CARREGANDO})
tela("K4", "Recebido", tipo="captura", estados={
    "normal": '<div class="aviso aviso--certo" role="status"><strong>Recebido.</strong> A Pepper responde na conversa.</div>'
              + acoes(botao("Voltar", "CV", principal=True)),
    "vazio": '<div class="aviso aviso--atencao" role="status"><strong>Recebido, sem internet.</strong> Sobe quando a conexão voltar, '
             'com a hora de agora.</div><h2>Na fila do aparelho</h2>'
             + lista(item("Foto", "tirada às 12:40", "esperando"), item("Áudio · 0:22", "gravado às 12:43", "esperando"))
             + acoes(botao("Voltar", "CV", principal=True)),
    "erro": '<div class="aviso aviso--erro" role="alert"><strong>Não deu para mandar.</strong> Ficou na fila e sobe sozinho.</div>'
            + acoes(botao("Voltar", "CV", principal=True)),
    "carregando": CARREGANDO})

# ---------- Vida ----------
PENDENTES = lista(
    item("Pagar o DARF", "Finanças · vence hoje · R$ 1.240,00", ir=None, cls="item--vencido", acao=botao("Feito", principal=True)),
    item("Renovar o domínio do SaaS", "Trabalho e SaaS · " + data("2026-11-27"), acao=botao("Feito", leve=True)),
    item("Proposta: pagar a internet", "Casa · R$ 119,90 · da Pepper", acao=botao("Ver", "CV2", leve=True)))
AREAS = lista(*[item(n, fim=str(q), ir="VI1") for n, q in (("Trabalho e SaaS", 5), ("Saúde", 2), ("Casa", 3), ("Família", 1),
                                                       ("Finanças", 4), ("Gatos", 2), ("Projetos pessoais", 3))])
MAIS_VIDA = lista(item("Feitas", ir="VI4"), item("Anotações do Jean", ir="VI6"), item("Nova área", ir="VI3"))
tela("VI0", "Vida", tipo="primeiro", secao="VI0", estados=padrao(
    "<h2>Precisa de você hoje</h2>" + PENDENTES + "<h2>Áreas</h2>" + AREAS + "<h2>Mais</h2>" + MAIS_VIDA,
    "<h2>Precisa de você hoje</h2>" + vazio("Nada precisa de você hoje.", "", botao("Nova tarefa", "K3", principal=True))
    + "<h2>Áreas</h2>" + AREAS + "<h2>Mais</h2>" + MAIS_VIDA))
tela("VI1", "Casa", pai="VI0", secao="VI0", estados=padrao(
    acoes(botao("Nova tarefa nesta área", "K3", principal=True)) + "<h2>Com prazo</h2>"
    + lista(item("Pagar a internet", data("2026-11-28"), ir="VI2"), item("Trocar o filtro da torneira", data("2026-12-02"), ir="VI2"))
    + "<h2>Sem prazo</h2>" + lista(item("Consertar a porta do armário", "criada pela Pepper", ir="VI2"))
    + "<h2>Notas da área</h2><p class=\"texto-2\">O síndico atende de manhã.</p>",
    vazio("Nenhuma tarefa aberta em Casa.", "", botao("Nova tarefa nesta área", "K3", principal=True))))
tela("VI2", "Tarefa", pai="VI1", secao="VI0", estados=padrao(
    "<h1>Trocar o filtro da torneira</h1>"
    + lista(item("Prazo", data("2026-12-02")), item("Área", "Casa"), item("De onde veio", "Áudio do Jean, criada pela Pepper"),
            item("Notas", "O modelo está na foto da caixa."),
            item("Histórico", "Criada " + data("2026-11-20", True) + " · adiada uma vez"))
    + acoes(botao("Feito", principal=True), botao("Adiar", leve=True), botao("Mudar o prazo", leve=True),
            botao("Mudar de área", leve=True), botao("Falar sobre isto", "CV", leve=True))
    + '<div class="perigoso">' + acoes(botao("Cancelar a tarefa", leve=True), botao("Apagar", perigo=True))
    + '<p class="pequeno">Cancelar guarda no histórico. Apagar pede confirmação.</p></div>'))
tela("VI3", "Nova área", tipo="passo", pai="VI0", estados=padrao(
    campo("Nome da área", "n") + campo("Para que serve", "p", area=True) + acoes(botao("Criar a área", "VI0", principal=True))))
tela("VI4", "Feitas", pai="VI0", secao="VI0", estados=padrao(
    lista(item("Pagar a luz", "Casa · feita " + data("2026-11-21", True), cls="item--feito"),
          item("Mandar a nota ao contador", "Trabalho e SaaS · feita " + data("2026-11-20", True), cls="item--feito")),
    vazio("Nenhuma tarefa feita ainda.")))
tela("VI6", "Anotações do Jean", pai="VI0", secao="VI0", estados=padrao(
    "<p class=\"texto-2\">O que você pediu para a Pepper saber.</p>"
    + lista(item("Viagem no fim do mês", data("2026-11-20", True) + " · reorganizar os prazos daquela semana")),
    vazio("Nenhuma anotação.")))
tela("VI5", "Mingau", pai="VI1", secao="VI0", entrega=2, estados={"normal":
    lista(item("Nascimento", data("2021-03-14", True) + " de 2021"), item("Vacina", "próxima " + data("2027-01-10")),
          item("Ração", "acaba perto de " + data("2026-12-05", True)), item("Veterinário", "Dra. Paula · clínica do bairro"))
    + acoes(botao("Registrar vacina ou remédio", principal=True))})

# ---------- Agenda ----------
AGENDA = ("<h2>" + data("2026-11-23") + " · hoje</h2>"
          + lista(item("Reunião com o contador", "14:00 · Trabalho e SaaS", ir="AG1"),
                  item("Prazo: pagar o DARF", "Finanças", cls="item--vencido", ir="VI2"))
          + "<h2>" + data("2026-11-24") + "</h2>" + lista(item("Aniversário da Carla", "irmã", ir="AG3"))
          + "<h2>" + data("2026-11-27") + "</h2>" + lista(item("Renovação: domínio do SaaS", "R$ 59,90", ir="FI4"))
          + "<h2>" + data("2026-12-01") + "</h2>" + lista(item("Fatura do cartão final 1234 fecha", "", ir="FI7")))
tela("AG0", "Agenda", tipo="primeiro", secao="AG0", estados=padrao(
    acoes(botao("Novo compromisso", "AG4", principal=True), botao("Aniversários", "AG2", leve=True)) + AGENDA,
    acoes(botao("Novo compromisso", "AG4", principal=True), botao("Aniversários", "AG2", leve=True))
    + vazio("Nada nos próximos dias.", " Marque aqui, pela conversa ou pela captura.")))
tela("AG1", "Compromisso", pai="AG0", secao="AG0", estados=padrao(
    "<h1>Reunião com o contador</h1>"
    + lista(item("Quando", data("2026-11-23") + " · 14:00, 1 hora"), item("Onde", "Por vídeo"),
            item("Com quem", "Contador"), item("Lembrete", "30 minutos antes"))
    + acoes(botao("Mudar", principal=True), botao("Falar sobre isto", "CV", leve=True))
    + '<div class="perigoso">' + acoes(botao("Apagar o compromisso", perigo=True)) + "</div>"))
tela("AG2", "Aniversários", pai="AG0", secao="AG0", estados=padrao(
    lista(item("Carla", "irmã · " + data("2026-11-24"), ir="AG3"), item("Mãe", data("2027-01-03"), ir="AG3"),
          item("Pedro", "amigo · " + data("2027-02-18"), ir="AG3")),
    vazio("Nenhum aniversário guardado.", " Quando você citar alguém, a Pepper pergunta.")))
tela("AG3", "Carla", pai="AG2", secao="AG0", estados=padrao(
    lista(item("Relação", "irmã"), item("Aniversário", data("2026-11-24")),
          item("Notas", "Gosta de livros de suspense. Ano passado: um vinho."))
    + acoes(botao("Falar sobre isto", "CV", principal=True))))
tela("AG4", "Novo compromisso", tipo="passo", pai="AG0", estados=padrao(
    campo("O quê", "q") + campo("Quando", "w", tipo="datetime-local") + campo("Onde", "o")
    + acoes(botao("Salvar", "AG0", principal=True))))

# ---------- Finanças ----------
FI_LISTAS = lista(item("Gastos do mês", ir="FI1"), item("Assinaturas", fim="R$ 389,70 por mês", ir="FI3"),
                  item("Parcelas", ir="FI5"), item("Dívidas", ir="FI6"), item("Meios de pagamento", ir="FI7"),
                  item("Lista de desejos", ir="FI8"), item("Meses anteriores", ir="FI9"))
tela("FI0", "Finanças", tipo="primeiro", secao="FI0", estados=padrao(
    acoes(botao("Registrar gasto", "K1", principal=True)) + "<h2>Vence nos próximos 7 dias</h2>"
    + lista(item("DARF", "hoje", "R$ 1.240,00", cls="item--vencido", ir="VI2"),
            item("Domínio do SaaS", "renova " + data("2026-11-27"), "R$ 59,90", ir="FI4"),
            item("Notebook, parcela 3 de 10", data("2026-12-01"), "R$ 420,00", ir="FI5"))
    + "<h2>Gasto de novembro</h2><div class=\"numeros\"><div><span class=\"pequeno\">Pessoal</span><p class=\"grande\">R$ 3.812,40</p></div>"
      "<div><span class=\"pequeno\">SaaS</span><p class=\"grande\">R$ 1.146,00</p></div></div><h2>Listas</h2>" + FI_LISTAS,
    acoes(botao("Registrar gasto", "K1", principal=True)) + vazio("Nenhum gasto em novembro ainda.", " Tire a foto da nota ou conte à Pepper.")
    + "<h2>Listas</h2>" + FI_LISTAS))
GASTOS = lista(item("Mercado", data("2026-11-23", True) + " · cartão final 1234 · Pessoal", "R$ 312,40", ir="FI2"),
               item("Hospedagem do SaaS", data("2026-11-20", True) + " · cartão final 1234 · SaaS", "R$ 119,90", ir="FI2"),
               item("Farmácia", data("2026-11-18", True) + " · Pix · Pessoal", "R$ 64,80", ir="FI2"))
FILTRO = acoes(botao("Tudo", leve=True), botao("Pessoal", leve=True), botao("SaaS", leve=True))
tela("FI1", "Gastos do mês", pai="FI0", secao="FI0", estados=padrao(FILTRO + GASTOS, FILTRO + vazio("Nenhum gasto neste mês.")))
tela("FI2", "Mercado", pai="FI1", secao="FI0", estados=padrao(
    '<p class="grande">R$ 312,40</p>'
    + lista(item("Quando", data("2026-11-23")), item("Meio", "Cartão final 1234"), item("Uso", "Pessoal"),
            item("Categoria", "Mercado"), item("Itens da nota", "23 itens · lidos do QR da NFC-e"))
    + acoes(botao("Mudar", principal=True)) + '<div class="perigoso">' + acoes(botao("Apagar o gasto", perigo=True)) + "</div>"))
tela("FI3", "Assinaturas", pai="FI0", secao="FI0", estados=padrao(
    '<div class="numeros"><div><span class="pequeno">Pessoal por mês</span><p class="grande">R$ 129,80</p></div>'
    '<div><span class="pequeno">SaaS por mês</span><p class="grande">R$ 259,90</p></div></div><h2>Próxima renovação primeiro</h2>'
    + lista(item("Domínio do SaaS", "anual · renova " + data("2026-11-27"), "R$ 59,90", ir="FI4"),
            item("Hospedagem do SaaS", "mensal · renova " + data("2026-12-20"), "R$ 119,90", ir="FI4"),
            item("Música", "mensal · Pessoal · renova " + data("2026-12-03"), "R$ 21,90", ir="FI4")),
    vazio("Nenhuma assinatura registrada.")))
tela("FI4", "Hospedagem do SaaS", pai="FI3", secao="FI0", estados=padrao(
    lista(item("Valor", "R$ 119,90 por mês"), item("Renova", data("2026-12-20")), item("Aviso antes", "7 dias"),
          item("Meio", "Cartão final 1234"), item("Uso", "SaaS"))
    + acoes(botao("Vou cancelar", principal=True), botao("Mudar", leve=True))))
tela("FI5", "Parcelas", pai="FI0", secao="FI0", estados=padrao(
    lista(item("Geladeira", "faltam 5 de 12", "R$ 310,00"), item("Notebook", "faltam 8 de 10", "R$ 420,00")),
    vazio("Nenhuma compra parcelada.")))
tela("FI6", "Dívidas", pai="FI0", secao="FI0", estados=padrao(
    "<h2>Você deve</h2>" + lista(item("Pedro", "até " + data("2026-11-30"), "R$ 200,00", acao=botao("Marcar como paga", principal=True)))
    + "<h2>Devem a você</h2>" + lista(item("Lucas", "sem prazo", "R$ 150,00", acao=botao("Marcar como paga", leve=True))),
    vazio("Nenhuma dívida.", " Nem sua, nem de ninguém com você.")))
tela("FI7", "Meios de pagamento", pai="FI0", secao="FI0", estados=padrao(
    lista(item("Pix"), item("Cartão final 1234", "fecha dia 1 · vence dia 8"),
          item("Cartão virtual final 9876", "uso único · usado " + data("2026-11-15", True)))
    + acoes(botao("Novo cartão", principal=True)),
    vazio("Nenhum meio registrado.", "", botao("Novo cartão", principal=True))))
tela("FI8", "Lista de desejos", pai="FI0", secao="FI0", estados=padrao(
    acoes(botao("Novo desejo", principal=True))
    + lista(item("Cadeira de escritório", "prioridade alta", "R$ 1.900,00"), item("Fone sem fio", "prioridade normal", "R$ 600,00")),
    vazio("A lista está vazia.", "", botao("Novo desejo", principal=True))))
tela("FI9", "Meses anteriores", pai="FI0", secao="FI0", estados=padrao(
    lista(item("Outubro", "Pessoal R$ 3.630,10 · SaaS R$ 1.273,00", "R$ 4.903,10"),
          item("Setembro", "Pessoal R$ 3.402,55 · SaaS R$ 1.146,00", "R$ 4.548,55")),
    vazio("Ainda não há meses anteriores.")))

# ---------- Pessoas ----------
PE_LISTA = lista(item("Feed dela", ir="PE2"), item("Contrato e salário", ir="PE4"), item("Despesas de trabalho", ir="PE6"),
                 item("Trocas", ir="PE8"), item("Atas da cúpula", ir="PE9"), item("Patrimônio do Jean", ir="PE12"))
tela("PE1", "Pepper", tipo="primeiro", secao="PE1", sub="Chief of staff · desde " + data("2026-11-23", True), estados={
    "normal": acoes(botao("Dar um presente", "PE7", principal=True)) + "<h2>Pendente com ela</h2>"
              + '<p class="texto-2">Nada pendente.</p><h2>Com ela</h2>' + PE_LISTA,
    "salario": "<h2>Pendente com ela</h2>" + lista(item("Salário de novembro", "vence hoje", "R$ 12.000,00", cls="item--atencao"))
               + acoes(botao("Pagar o salário", "PE5", principal=True), botao("Dar um presente", "PE7", leve=True))
               + "<h2>Com ela</h2>" + PE_LISTA,
    "erro": ERRO, "carregando": CARREGANDO})
tela("PE4", "Contrato e salário", pai="PE1", secao="PE1", estados=padrao(
    "<h2>Vence</h2>" + lista(item("Salário de novembro (8 dias)", data("2026-12-05"), "R$ 12.000,00"))
    + acoes(botao("Pagar o salário", "PE5", principal=True))
    + "<h2>Contrato</h2>" + lista(item("Salário", "R$ 45.000,00 por mês, no dia 5"), item("Cargo", "Chief of staff"),
                                  item("Moeda", "Em reais; entra em dólar pelo câmbio do dia 5"))
    + acoes(botao("Mudar o salário", leve=True), botao("Bônus", leve=True), botao("Adiantamento", leve=True),
            botao("Folga", leve=True), botao("Promoção", leve=True))
    + "<h2>Holerites</h2>" + '<p class="texto-2">O primeiro sai em ' + data("2026-12-05") + ".</p>"))
tela("PE5", "Pagar o salário", tipo="passo", pai="PE1", estados=padrao(
    "<h1>Salário de novembro</h1>"
    + lista(item("Valor", "R$ 12.000,00 (8 dias de R$ 45.000,00)"), item("Data", data("2026-12-05")),
            item("Na conta dela", "em dólar, pelo câmbio do dia"), item("Holerite", "sai junto"))
    + acoes(botao("Confirmar", "PE1", principal=True), botao("Cancelar", "PE1", leve=True))
    + '<p class="pequeno">Dinheiro do mundo dela. Nada sai da sua conta real.</p>'))
tela("PE7", "Dar um presente", tipo="passo", pai="PE1", estados=padrao(
    campo("O que é, para quem e quando", "pr", area=True, extra=' data-presente placeholder="jantar japonês para ela e a Morgan, hoje às 20h"')
    + '<div class="aviso" data-previa hidden><strong>Um japonês no Brooklyn</strong><br>R$ 380,00 · chega às 20h no horário dela</div>'
    + acoes(botao("Enviar", "PE1", principal=True))
    + '<p class="pequeno">Sai do cofre. Depois de descrever, aparecem o lugar, o preço e a entrega.</p>'))
SIMPLES = [
    ("PE0", "Pessoas", None, 3, lista(item("Pepper", "Chief of staff", ir="PE1")) + "<h2>Mais</h2>"
     + lista(item("Quadro de tarefas", ir="PE14"), item("Vagas", ir="PE15"), item("Patrimônio do Jean", ir="PE12"))),
    ("PE2", "Feed dela", "PE1", 2, lista(item("a janela hoje cedo", "Foto: chuva no vidro, a mão segurando o café · " + data("2026-11-23", True)),
                                         item("terminei o livro. não gostei do final", data("2026-11-22", True)))),
    ("PE6", "Despesas de trabalho", "PE1", 2, lista(item("Reembolso: táxi para a feira", "pedido " + data("2026-11-22", True), "R$ 86,00",
                                                        acao=botao("Aprovar", principal=True)))
     + lista(item("Cartão corporativo", "limite R$ 5.000,00 · usado R$ 640,00"))),
    ("PE8", "Trocas", "PE1", 2, lista(item("Fotos"), item("Bilhetes"), item("Playlist"), item("Lista de desejos dela"),
                                      item("Promessas"), item("Caixinha de memórias"), item("Cartas para o futuro"),
                                      item("A linha do tempo de vocês"), item("Retrospectiva do ano"))
     + acoes(botao("Mandar uma foto", "CV", principal=True), botao("Escrever um bilhete", "CV", leve=True))),
    ("PE9", "Atas da cúpula", "PE1", 2, lista(item("Mudar a reserva de banco", "reunião " + data("2026-11-21", True)))),
    ("PE10", "Avaliação", "PE1", 2, '<p class="texto-2">Quando ela propuser, ou você pedir.</p>' + acoes(botao("Responder", principal=True))),
    ("PE12", "Patrimônio do Jean", "PE1", 2, lista(item("Casa de campo", "Serra · sua", ir="PE13")) + acoes(botao("Comprar um bem", principal=True))),
    ("PE13", "Casa de campo", "PE12", 2, lista(item("Onde", "Serra"), item("Valor", "R$ 1.200.000,00"), item("Situação", "sua"))
     + acoes(botao("Emprestar", principal=True), botao("Dar", leve=True))),
    ("PE14", "Quadro de tarefas", "PE0", 3, '<p class="texto-2">A Pepper distribui e cobra.</p>'
     + lista(item("Resumo da semana do SaaS", "Programador · atrasada", cls="item--vencido"))),
    ("PE15", "Vagas", "PE0", 3, acoes(botao("Abrir uma vaga", principal=True)) + lista(item("Programador", "3 candidatos", ir="PE16"))),
    ("PE16", "Candidato", "PE15", 3, lista(item("Currículo", "10 anos de produto"), item("Entrevista", "feita"),
                                           item("A Pepper acha", "“bom, mas fala demais”"))
     + acoes(botao("Contratar", principal=True), botao("Recusar", leve=True))),
    ("VI5", None, None, None, None),
]
for cod, tit, pai, ent, corpo in SIMPLES:
    if tit:
        tela(cod, tit, tipo="primeiro" if cod == "PE0" else "filho", pai=pai, secao="PE1", entrega=ent, estados={"normal": corpo})

# ---------- Ajustes ----------
tela("AJ0", "Ajustes", pai="CV", secao=None, estados=padrao(
    lista(item("Avisos", ir="AJ1"), item("Entrada e aparelhos", ir="AJ2"), item("Instalar", ir="AJ3"),
          item("Painel do Jean", "pede a senha se a sessão do painel venceu", ir="PJ0"))))
tela("AJ1", "Avisos", pai="AJ0", estados=padrao(
    '<p class="texto-2">Os avisos estão desligados neste aparelho.</p>' + acoes(botao("Ligar os avisos", principal=True))
    + "<h2>Na tela bloqueada</h2>"
    + '<label class="marca"><input type="radio" name="t" checked> Só “Nova mensagem”</label>'
    + '<label class="marca"><input type="radio" name="t"> Mostrar o texto</label>'))
tela("AJ2", "Entrada e aparelhos", pai="AJ0", estados=padrao(
    lista(item("iPhone", "este aparelho · lembrado até " + data("2027-02-21", True)), item("iPad", "último uso " + data("2026-11-22", True)))
    + acoes(botao("Trocar a senha", principal=True), botao("Sair", "entrar", leve=True))
    + '<div class="perigoso">' + acoes(botao("Sair de todos os aparelhos", perigo=True)) + "</div>"))
tela("AJ3", "Instalar", pai="AJ0", estados=padrao(
    '<ol class="lista"><li class="item">1. No Safari, toque em Compartilhar.</li><li class="item">2. Toque em “Adicionar à Tela de Início”.</li>'
    '<li class="item">3. Toque em “Adicionar”.</li></ol><p class="pequeno">Os avisos só chegam com a Central na Tela de Início.</p>'))

# ---------- Painel do Jean ----------
def painel(cod, titulo, normal, v=None, pai="PJ0", entrega=1):
    tela(cod, titulo, tipo="painel", pai=pai, entrega=entrega, estados=padrao(normal, v) if entrega == 1 else {"normal": normal})


tela("PJ", "Painel do Jean", tipo="passo", pai="AJ0", estados={
    "normal": "<h1>Painel do Jean</h1>" + campo("Senha", "s", tipo="password") + acoes(botao("Entrar", "PJ0", principal=True)),
    "erro": "<h1>Painel do Jean</h1>" + campo("Senha", "s2", tipo="password", erro="Senha errada. 4 tentativas antes do bloqueio de 15 minutos.")
            + acoes(botao("Entrar", "PJ0", principal=True)), "carregando": CARREGANDO})
PJ_LISTA = lista(*[item(n, ir=c) for c, n in (("PJ1", "Custos"), ("PJ2", "Mundo"), ("PJ3", "Cânone"), ("PJ4", "Pessoas"),
                                               ("PJ5", "Chaves"), ("PJ6", "Cúpula"), ("PJ7", "Carteira e conta"),
                                               ("PJ8", "Cofre e patrimônio"), ("PJ9", "Módulos"), ("PJ10", "Pedidos de função"),
                                               ("PJ11", "Testes de personalidade"), ("PJ12", "Registros e falhas"), ("PJ13", "Sistema"))])
painel("PJ0", "Painel", '<div class="aviso aviso--certo">Nenhuma falha aberta.</div>'
       + '<div class="numeros"><div><span class="pequeno">IA hoje</span><p class="grande">US$ 0,84</p></div>'
         '<div><span class="pequeno">IA no mês</span><p class="grande">US$ 14,20</p><span class="pequeno">de US$ 60,00</span></div></div>'
       + "<h2>Pedidos de função</h2>" + lista(item("Acompanhar a natação", "1 novo"))
       + acoes(botao("Ver os pedidos", "PJ10", principal=True))
       + "<h2>Mundo</h2>" + lista(item("Rodando", "último ciclo 13:10"), item("Backup", "hoje, 03:00"))
       + "<h2>Tudo</h2>" + PJ_LISTA, pai="AJ0")
painel("PJ1", "Custos", "<h2>Pepper, hoje, por camada</h2>"
       + lista(item("Mente", "modelo principal", "US$ 0,21"), item("Resposta", "modelo principal", "US$ 0,17"),
               item("Crítica", "modelo menor", "US$ 0,03"), item("Motor", "modelo menor · teto US$ 1,00 por dia", "US$ 0,38"),
               item("Verificador", "modelo menor", "US$ 0,05"))
       + "<h2>No mês</h2>" + lista(item("Pepper", "teto US$ 60,00, com o motor dentro", "US$ 14,20"))
       + acoes(botao("Mudar um teto", principal=True)))
painel("PJ2", "Mundo", lista(item("Estado", "rodando"), item("Ritmo", "de 15 minutos a 4 horas entre ciclos"),
                             item("Teto do motor", "US$ 1,00 por dia · hoje US$ 0,38"))
       + "<h2>Últimos ciclos</h2>" + lista(item("13:10", "4 eventos", "US$ 0,02"), item("12:40", "2 eventos", "US$ 0,01"))
       + acoes(botao("Pausar o mundo", principal=True), botao("Mudar o ritmo", leve=True)))
painel("PJ3", "Cânone", lista(item("09:41 · no carro, levando a Morgan à escola", "conversa · aceito", acao=botao("Corrigir", principal=True)),
                              item("07:10 · acordou, café, chuva fina", "motor · aceito", acao=botao("Corrigir", leve=True)),
                              item("07:05 · “estava em Boston”", "conversa · recusado: estava em casa")),
       vazio("O mundo ainda não começou."))
painel("PJ4", "Pessoas", lista(item("Pepper", "ativa · teto US$ 60,00 por mês"))
       + "<h2>Modelos da Pepper</h2>" + lista(item("Mente", "principal"), item("Resposta", "principal"), item("Crítica", "menor"),
                                              item("Motor", "menor"), item("Verificador", "menor"))
       + "<h2>Permissões</h2>" + lista(item("vida/", "lê e grava"))
       + acoes(botao("Mudar a ficha", leve=True), botao("Mudar os modelos", leve=True))
       + '<p class="pequeno">Mudar a personalidade ou os modelos roda os testes antes.</p>'
       + '<div class="perigoso">' + acoes(botao("Desligar a Pepper", perigo=True)) + "</div>")
painel("PJ5", "Chaves", "<h2>Pepper</h2>"
       + lista(item("Paixão", "ligada · pode surgir sozinha"), item("Romance entre agentes", "desligada"),
               item("Demissão", "desligada · ela pode ameaçar, mas não sai"), item("Dor grave", "desligada"))
       + acoes(botao("Mudar as chaves", principal=True))
       + '<p class="pequeno">Uma chave muda a direção aos poucos. Um evento forte mexe na hora.</p>'
       + "<h2>Pelo Jean, agora</h2>" + lista(item("Afeto", "", "12 · subindo"), item("Confiança", "", "18 · subindo"),
                                             item("Admiração", "", "15 · estável"), item("Atração", "", "6 · subindo"))
       + '<p class="pequeno">Humor: um pouco irritada (trânsito).</p>')
painel("PJ6", "Cúpula", "<h2>Amigos vivos</h2>" + lista(item("Hermione Granger"), item("Leia Organa"), item("Mary Poppins"))
       + "<h2>Conhecidos distantes</h2>" + lista(item("Ruth Porat"), item("Sheryl Sandberg"), item("Angela Merkel"), item("Elon Musk"))
       + "<h2>Inspirações</h2>" + lista(item("Peter Drucker"), item("Ada Lovelace"), item("Jesus (visão gnóstica)"))
       + acoes(botao("Mudar a cúpula", principal=True)))
painel("PJ7", "Carteira e conta", '<div class="numeros"><div><span class="pequeno">Conta</span><p class="grande">US$ 311.240</p></div>'
       '<div><span class="pequeno">Carteira</span><p class="grande">US$ 92.880</p><span class="pequeno">+1,2% no mês</span></div></div>'
       + "<h2>Posições</h2>" + lista(item("Fundo de índice dos EUA", "120 cotas · preço médio US$ 512", "+2,1%"),
                                     item("Banco brasileiro", "800 ações · preço médio R$ 31,40", "−1,8%"))
       + "<h2>Ordens</h2>" + lista(item("Vendeu metade do banco", "“não gostei do que li sobre juros” · " + data("2026-11-21", True))),
       vazio("Ela ainda não investiu.", " A reserva está parada na conta."))
painel("PJ8", "Cofre e patrimônio", '<p class="grande">R$ 2.000.000,00</p><p class="pequeno">Ninguém no mundo sabe quanto é.</p>'
       + acoes(botao("Pôr dinheiro no cofre", principal=True)) + "<h2>Bens</h2>" + lista(item("Casa de campo", "Serra · sua")), entrega=2)
painel("PJ9", "Módulos", lista(item("Tarefas", "vida real · entrega 1", acao=botao("Desligar", leve=True)),
                               item("Investimentos", "mundo · entrega 1 · US$ 0,90 no mês", acao=botao("Desligar", leve=True)),
                               item("Gatos", "vida real · entrega 2 · desligado")))
painel("PJ10", "Pedidos de função", lista(
    item("Acompanhar a natação", "pedido pela Pepper · " + data("2026-11-23", True) + " · com o Jean", acao=botao("Pronto", principal=True)),
    item("Lembrar de beber água", "pedido pela Pepper · novo", acao=botao("Levei ao revisor", leve=True))),
       vazio("Nenhum pedido de função."))
painel("PJ11", "Testes de personalidade", lista(item("Prazo ignorado pela terceira vez", "passou"),
                                                 item("Notícia que ela não leu", "passou"))
       + acoes(botao("Rodar os testes", principal=True)), entrega=2)
painel("PJ12", "Registros e falhas", '<div class="aviso aviso--certo">Nenhuma falha aberta.</div><h2>Registro de hoje</h2>'
       + lista(item("13:05 · conversa", "Pepper", "US$ 0,01"), item("13:10 · ciclo do motor", "", "US$ 0,02")))
painel("PJ13", "Sistema", lista(item("Servidor", "no ar"), item("OpenAI", "no ar"), item("Cotações (Yahoo Finance)", "no ar"),
                                item("Notícias (RSS)", "no ar"), item("Clima e câmbio", "no ar"),
                                item("Relógio do trabalho", "último ciclo 13:11"), item("Relógio da vida", "último ciclo 13:10"),
                                item("Backup", "hoje, 03:00 · central-backup"))
       + acoes(botao("Fazer backup agora", principal=True)))

# ---------- Entrada ----------
def passo(cod, titulo, normal, erro=None, pai=None):
    d = {"normal": normal}
    if erro:
        d["erro"] = erro
    d["carregando"] = CARREGANDO
    tela(cod, titulo, tipo="passo", pai=pai, estados=d)


passo("passo-1", "Instalar", "<h1>Ponha a Central na Tela de Início</h1>"
      '<ol class="lista"><li class="item">1. Toque em Compartilhar.</li><li class="item">2. Toque em “Adicionar à Tela de Início”.</li>'
      '<li class="item">3. Toque em “Adicionar” e abra a Central por lá.</li></ol>'
      '<p class="pequeno">É lá que os avisos funcionam.</p>' + acoes(botao("Já instalei", "passo-4", leve=True)))
passo("passo-4", "Entrar", "<h1>Entrar na Central</h1>" + campo("E-mail", "em", tipo="email")
      + acoes(botao("Mandar código", "passo-5", principal=True)),
      "<h1>Entrar na Central</h1>" + campo("E-mail", "em2", tipo="email", erro="Este e-mail não tem conta na Central.")
      + acoes(botao("Mandar código", "passo-5", principal=True)))
passo("passo-5", "Código", "<h1>O código</h1><p class=\"texto-2\">Mandamos 6 números para o seu e-mail. Valem 10 minutos.</p>"
      + campo("Código", "cd", extra=' inputmode="numeric" autocomplete="one-time-code"') + acoes(botao("Mandar outro código", leve=True)),
      "<h1>O código</h1>" + campo("Código", "cd2", erro="Código errado ou vencido.") + acoes(botao("Mandar outro código", principal=True)))
passo("passo-6", "Senha", "<h1>Crie a senha</h1>" + campo("Senha", "sn", tipo="password")
      + '<p class="pequeno">12 caracteres ou mais.</p>' + acoes(botao("Continuar", "passo-7", principal=True)),
      "<h1>Crie a senha</h1>" + campo("Senha", "sn2", tipo="password", erro="A senha precisa de 12 caracteres ou mais.")
      + acoes(botao("Continuar", "passo-7", principal=True)))
passo("passo-7", "Avisos", "<h1>Ligar os avisos</h1><p class=\"texto-2\">Na tela bloqueada aparece só “Nova mensagem”. "
      "Dá para mudar em Ajustes.</p>" + acoes(botao("Ligar os avisos", "CV", principal=True), botao("Agora não", "CV", leve=True)))
passo("entrar", "Entrar", "<h1>Entrar</h1>" + campo("E-mail", "e1", tipo="email") + campo("Senha", "s1", tipo="password")
      + acoes(botao("Entrar", "CV", principal=True), botao("Esqueci a senha", "esqueci", leve=True)),
      "<h1>Entrar</h1>" + '<div class="aviso aviso--erro" role="alert">E-mail ou senha errados. Depois de 5 tentativas, a entrada '
      "fica bloqueada por 15 minutos.</div>" + campo("E-mail", "e2", tipo="email") + campo("Senha", "s3", tipo="password")
      + acoes(botao("Entrar", "CV", principal=True), botao("Esqueci a senha", "esqueci", leve=True)))
passo("esqueci", "Esqueci a senha", "<h1>Esqueci a senha</h1><p class=\"texto-2\">Mandamos um código ao e-mail da conta. "
      "Com ele, você cria a senha nova, e os outros aparelhos saem.</p>" + campo("E-mail", "e3", tipo="email")
      + acoes(botao("Mandar código", "passo-5", principal=True)), pai="entrar")


# ---------- página ----------
def pagina(cod):
    t = TELAS[cod]
    tipo, pai = t["tipo"], t["pai"]
    sub = f'<span class="topo__sub">{t["sub"]}</span>' if t["sub"] else ""
    titulo = f'<h1 class="oculto">{t["titulo"]}</h1>' if tipo in ("primeiro", "filho", "painel", "captura") else ""
    if tipo == "primeiro":
        esq = f'<a href="{href("AJ0")}">Ajustes</a>'
    elif tipo == "captura":
        esq = f'<a href="{href("CV")}">Cancelar</a>'
    elif pai:
        esq = f'<a href="{href(pai)}">‹ {TELAS[pai]["titulo"] if pai in TELAS else "Voltar"}</a>'
    else:
        esq = ""
    dir_ = f'<a href="{href("K1")}">Capturar</a>' if tipo in ("primeiro", "filho") else ""
    topo = (f'<header class="topo"><span class="topo__esq">{esq}</span><div class="topo__titulo">{t["titulo"]}{sub}</div>'
            f'<span class="topo__dir">{dir_}</span></header>')
    if tipo == "passo" and cod.startswith(("passo", "entrar", "esqueci")):
        topo = f'<header class="topo"><span class="topo__esq">{esq}</span><div class="topo__titulo">Central</div><span class="topo__dir"></span></header>'
    nav = ""
    if tipo in ("primeiro", "filho") and t["secao"]:
        nav = '<nav class="secoes" aria-label="Seções">' + "".join(
            f'<a href="{href(c)}"{" aria-current=\"page\"" if c == t["secao"] else ""}>{n}</a>' for c, n in SECOES) + "</nav>"
    corpo = ""
    for nome, h in t["estados"].items():
        cls = "conversa" if t["extra"] == "conversa" and nome != "carregando" else ""
        corpo += f'<div class="{cls}" data-estado="{nome}">{h}</div>'
    escrever = ""
    if t["extra"] == "conversa":
        escrever = ('<form class="escrever" onsubmit="return false"><label class="oculto" for="msg">Mensagem</label>'
                    '<input id="msg" placeholder="Mensagem"><button class="botao" type="button">Áudio</button>'
                    '<button class="botao botao--principal" type="submit">Enviar</button></form>')
        main = f'<main class="conversa-tela">{titulo}{corpo}</main>'
    else:
        main = f'<main class="conteudo">{titulo}{corpo}</main>'
    estados = " ".join(f'<a href="?estado={n}">{n}</a>' for n in t["estados"])
    ent = "" if t["entrega"] == 1 else f' · entrega {t["entrega"]} (versão simples)'
    p = "../../"
    return f"""<!doctype html>
<html lang="pt-BR" data-tela="{cod}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="color-scheme" content="light dark">
<title>{t["titulo"]} · Central</title>
<link rel="stylesheet" href="{p}assets/design/tokens.css">
<link rel="stylesheet" href="{p}assets/design/componentes.css">
</head>
<body>
<div class="tela{' tela--passo' if tipo == 'passo' else ''}">
{topo}
{main}
{escrever}
{nav}
</div>
<div class="prototipo"><span>Tela {cod}{ent}. Estados:</span> {estados} <button type="button" data-modo="light">Claro</button><button type="button" data-modo="dark">Escuro</button><button type="button" data-modo="auto">Como o aparelho</button> <a href="../index.html">Mapa</a></div>
<script src="{p}assets/design/central.js"></script>
</body>
</html>
"""


def mapa():
    grupos = [("Entrada", "passo"), ("Entrada", "entrar"), ("Entrada", "esqueci"), ("Conversa", "CV"), ("Captura", "K"),
              ("Vida", "VI"), ("Agenda", "AG"), ("Finanças", "FI"), ("Pessoas", "PE"), ("Ajustes", "AJ"), ("Painel do Jean", "PJ")]
    out, vistos = [], set()
    for nome, pre in grupos:
        cods = [c for c in ORDEM if c.startswith(pre) and c not in vistos]
        if not cods:
            continue
        vistos.update(cods)
        out.append(f"<h2>{nome}</h2><ul class=\"lista\">" + "".join(
            f'<li><a class="item" href="{pasta(c)}/{arquivo(c)}"><span class="item__texto"><strong>{c} · {TELAS[c]["titulo"]}</strong>'
            f'<span class="item__det">{", ".join(TELAS[c]["estados"])}{"" if TELAS[c]["entrega"] == 1 else " · entrega " + str(TELAS[c]["entrega"])}</span></span></a></li>'
            for c in cods) + "</ul>")
    return f"""<!doctype html>
<html lang="pt-BR" data-tela="mapa">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="color-scheme" content="light dark">
<title>Mapa · Central</title>
<link rel="stylesheet" href="../assets/design/tokens.css">
<link rel="stylesheet" href="../assets/design/componentes.css">
</head>
<body>
<div class="tela"><main class="conteudo">
<h1>Mapa do protótipo</h1>
<p class="texto-2">As telas da Central, com dados inventados. O “hoje” é <span data-data="2026-11-23"></span>. Cada tela tem os seus estados na barra de baixo.</p>
<ul class="lista"><li><a class="item" href="componentes/index.html"><span class="item__texto"><strong>Componentes</strong><span class="item__det">cada um em todos os estados</span></span></a></li>
<li><a class="item" href="direcoes/index.html"><span class="item__texto"><strong>As três direções</strong><span class="item__det">a escolhida foi a A · Mensagens</span></span></a></li></ul>
{"".join(out)}
</main></div>
<script src="../assets/design/central.js"></script>
</body>
</html>
"""


if __name__ == "__main__":
    for c in ORDEM:
        d = os.path.join(RAIZ, pasta(c))
        os.makedirs(d, exist_ok=True)
        open(os.path.join(d, arquivo(c)), "w").write(pagina(c))
    open(os.path.join(RAIZ, "index.html"), "w").write(mapa())
    print(f"{len(ORDEM)} telas geradas.")
