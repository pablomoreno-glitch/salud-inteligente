"""Paso 1: lee los dos Excel y deja filas.json + img/ (una foto por fila, la que esta anclada en la columna A)."""
import json
import os
import sys

from openpyxl import load_workbook

HERE = os.path.dirname(os.path.abspath(__file__))
FILES = [  # (archivo, origen, fila de encabezados)
    (sys.argv[1], "GLNP", 3),  # inventario_GL_NP_v4.xlsx
    (sys.argv[2], "EO", 1),    # catalogo_eloasis_CON_PARA_QUE_SIRVE.xlsx
]
os.makedirs(os.path.join(HERE, "img"), exist_ok=True)
rows = []
for path, src, header in FILES:
    ws = load_workbook(path).worksheets[0]
    images = {img.anchor._from.row + 1: img for img in ws._images}
    section = None
    for r in range(header + 1, ws.max_row + 1):
        v = [ws.cell(r, c).value for c in range(1, 13)]
        if v[1] is None and v[0] and not any(v[2:]):
            section = str(v[0]).strip()
            continue
        if v[2] is None:
            continue
        d = dict(src=src, row=r, section=section, nro=v[1], prod=str(v[2]).strip(), cant=v[3], pres=v[4], prov=v[5],
                 desc=v[6], uso=v[7], sirve=v[8], prec=v[9], may=v[10], venta=v[11], img=None)
        if r in images:
            d["img"] = f"{src}_{r}.jpg"
            open(os.path.join(HERE, "img", d["img"]), "wb").write(images[r]._data())
        rows.append(d)
json.dump(rows, open(os.path.join(HERE, "filas.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1, default=str)
print(len(rows), "filas")
