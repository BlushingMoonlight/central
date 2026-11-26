#!/usr/bin/env python3
"""Gera os ícones do app (app/icones/) em pixel art, no estilo do jogo (rodada 9, parte I, I3; DEC-201): aconchego e luz
quente, arte original (nada da Marvel, DEC-037). Três opções, desenhadas numa grade de 24 x 24 e aumentadas sem suavizar:

- janela (o padrão): a janela da casa acesa à noite, com o gato no parapeito (a mesma da abertura);
- casinha: a casa com a janela e a porta acesas;
- abajur: o abajur aceso, com o halo de luz.

Cada opção sai em app/icones/opcoes/<nome>-{180,192,512}.png e <nome>.svg; a padrão é copiada para icone-180.png
(apple-touch-icon), icone-192.png, icone-512.png, icone.svg (favicon) e icone-adaptavel-512.png (Android, fundo
adaptável: o desenho dentro da zona segura de 80%). Para trocar a padrão: python3 scripts/gerar_icones.py casinha
As cores são as de assets/design/tokens.css (o jogo); ícone é imagem, por isso é a exceção do verificador.
Como rodar: python3 scripts/gerar_icones.py [janela|casinha|abajur]   (precisa do Pillow).
"""
import os
import sys
from PIL import Image

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app", "icones")
NOITE, JANELA, OURO, LUZ, ROXO, CREME, LILAS = "#1B1430", "#1A1624", "#FAD28C", "#F6D76B", "#3B2A55", "#FFF8EC", "#B9A6D6"
TELHA, MADEIRA = "#E0405A", "#5A3E2B"
N = 24


def grade():
    return [[NOITE] * N for _ in range(N)]


def ret(g, x, y, w, h, cor):
    for j in range(y, y + h):
        for i in range(x, x + w):
            if 0 <= i < N and 0 <= j < N:
                g[j][i] = cor


def janela():
    g = grade()
    for x, y in ((3, 3), (20, 4), (5, 19), (19, 20)):
        ret(g, x, y, 1, 1, CREME)                      # as estrelas
    ret(g, 6, 6, 12, 12, OURO)                         # a moldura
    ret(g, 7, 7, 10, 10, LUZ)                          # a luz de dentro
    ret(g, 8, 8, 3, 2, CREME)                          # o brilho no vidro
    ret(g, 11, 7, 2, 10, MADEIRA)                      # a cruz da janela
    ret(g, 7, 11, 10, 2, MADEIRA)
    ret(g, 8, 14, 3, 3, JANELA)                        # o gato no parapeito
    ret(g, 8, 13, 1, 1, JANELA); ret(g, 10, 13, 1, 1, JANELA)
    ret(g, 5, 18, 14, 1, OURO)                         # o parapeito
    return g


def casinha():
    g = grade()
    for x, y in ((3, 3), (20, 3)):
        ret(g, x, y, 1, 1, CREME)
    for k in range(6):                                 # o telhado, em degraus
        ret(g, 12 - k - 1, 5 + k, 2 * (k + 1), 1, TELHA)
    ret(g, 6, 11, 12, 8, ROXO)                         # a parede
    ret(g, 8, 13, 4, 3, LUZ)                           # a janela acesa
    ret(g, 9, 13, 1, 3, OURO); ret(g, 8, 14, 4, 1, OURO)
    ret(g, 13, 13, 3, 6, JANELA)                       # a porta
    ret(g, 14, 15, 1, 1, LUZ)                          # a maçaneta
    ret(g, 5, 19, 14, 1, OURO)                         # o chão
    ret(g, 15, 6, 2, 3, LILAS)                         # a chaminé
    return g


def abajur():
    g = grade()
    for r, cor in ((8, ROXO), (6, "#4A3A6B")):         # o halo de luz
        for j in range(N):
            for i in range(N):
                if (i - 11.5) ** 2 + (j - 9.5) ** 2 <= r * r:
                    g[j][i] = cor
    for k in range(5):                                 # a cúpula
        ret(g, 9 - k // 2, 6 + k, 6 + (k // 2) * 2, 1, OURO)
    ret(g, 9, 11, 6, 1, LUZ)                           # a luz que sai
    ret(g, 11, 12, 2, 6, LILAS)                        # a haste
    ret(g, 8, 18, 8, 2, OURO)                          # a base
    ret(g, 6, 20, 12, 1, JANELA)
    return g


OPCOES = {"janela": janela, "casinha": casinha, "abajur": abajur}


def png(g, lado, caminho, margem=0):
    im = Image.new("RGB", (N, N))
    im.putdata([tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) for linha in g for c in linha])
    dentro = lado - 2 * margem
    im = im.resize((dentro, dentro), Image.NEAREST)
    if margem:
        fundo = Image.new("RGB", (lado, lado), NOITE)
        fundo.paste(im, (margem, margem))
        im = fundo
    im.save(caminho)


def svg(g):
    r = "".join(f'<rect x="{i}" y="{j}" width="1" height="1" fill="{c}"/>' for j, linha in enumerate(g) for i, c in enumerate(linha) if c != NOITE)
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {N} {N}" shape-rendering="crispEdges"><rect width="{N}" height="{N}" fill="{NOITE}"/>{r}</svg>\n'


padrao = sys.argv[1] if len(sys.argv) > 1 else "janela"
if padrao not in OPCOES:
    sys.exit("opção desconhecida: " + padrao)
os.makedirs(os.path.join(RAIZ, "opcoes"), exist_ok=True)
for nome, f in OPCOES.items():
    g = f()
    for lado in (180, 192, 512):
        png(g, lado, os.path.join(RAIZ, "opcoes", f"{nome}-{lado}.png"))
    open(os.path.join(RAIZ, "opcoes", nome + ".svg"), "w").write(svg(g))
    if nome == padrao:
        for lado in (180, 192, 512):
            png(g, lado, os.path.join(RAIZ, f"icone-{lado}.png"))
        png(g, 512, os.path.join(RAIZ, "icone-adaptavel-512.png"), margem=52)
        open(os.path.join(RAIZ, "icone.svg"), "w").write(svg(g))
print("ícones gerados; o padrão é:", padrao)
