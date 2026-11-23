#!/usr/bin/env python3
"""Gera os ícones do app (app/icones/): um monograma "C" neutro, desenhado como um arco, sem nada da Marvel (DEC-037).

As cores são as de assets/design/tokens.css (--destaque e --sobre-destaque, no claro); ícone é imagem, por isso é a
exceção do verificador (como o manifest.webmanifest). Como rodar: python3 scripts/gerar_icones.py (precisa do Pillow).
"""
import os
from PIL import Image, ImageDraw

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app", "icones")
FUNDO, LETRA = "#2B59C3", "#FFFFFF"   # --destaque e --sobre-destaque


def png(lado, nome):
    s = 4  # desenha maior e reduz, para a borda ficar lisa
    t = lado * s
    im = Image.new("RGB", (t, t), FUNDO)
    d = ImageDraw.Draw(im)
    m = t * 0.27
    d.arc([m, m, t - m, t - m], start=45, end=315, fill=LETRA, width=int(t * 0.11))
    im.resize((lado, lado), Image.LANCZOS).save(os.path.join(RAIZ, nome))


os.makedirs(RAIZ, exist_ok=True)
for lado, nome in ((180, "icone-180.png"), (192, "icone-192.png"), (512, "icone-512.png")):
    png(lado, nome)
open(os.path.join(RAIZ, "icone.svg"), "w").write(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="{FUNDO}"/>'
    f'<path d="M 66.26 33.74 A 23 23 0 1 0 66.26 66.26" fill="none" stroke="{LETRA}" stroke-width="11"/></svg>\n')
print("ícones gerados")
