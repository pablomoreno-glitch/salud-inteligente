"""Genera el nuevo seed/catalog.json a partir de los Excel de Greenlab/NaturPro y El Oasis.

- Reusa Ref, slug, foto y metadatos de los productos que ya existian (mapeo.py).
- Los productos nuevos reciben Ref nueva y la foto extraida del Excel.
- Los productos actuales que no estan en los Excel quedan con is_active = false.
"""
import json
import os
import re
import subprocess
import sys
import unicodedata

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from mapeo import EO, GLNP, INACTIVE_EO, PRICE_OVERRIDES  # noqa: E402

REPO = sys.argv[1]
SEED = os.path.join(REPO, "app/microservices/catalog/seed/catalog.json")
MEDIA = os.path.join(REPO, "app/frontend/public/media/products")

rows = json.load(open(os.path.join(HERE, "filas.json"), encoding="utf-8"))
current = json.load(open(SEED, encoding="utf-8"))
cur = {p["ref"]: p for p in current["products"]}
old = {p["ref"]: p for p in json.load(open(os.path.join(HERE, "cat_old.json"), encoding="utf-8"))["products"]}


def nro(d):
    return int(float(d["nro"]))


def clean(v):
    if v is None:
        return None
    s = re.sub(r"\s+", " ", str(v)).strip()
    return s or None


def slugify(s):
    s = unicodedata.normalize("NFD", s.lower()).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def money(v):
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return int(round(v))
    digits = re.sub(r"[^\d]", "", str(v))
    return int(digits) if digits else None


def split_items(text, limit=5):
    if not text:
        return []
    parts = [p.strip(" .;") for p in re.split(r"[,;]", str(text)) if p.strip(" .;")]
    out = []
    for p in parts:
        p = p[0].upper() + p[1:]
        if p not in out:
            out.append(p)
    return out[:limit]


def sentence(s):
    s = clean(s)
    if not s:
        return None
    s = s[0].upper() + s[1:]
    return s if s.endswith((".", "!", "?")) else s + "."


def title_case(name):
    keep = {"NAD+", "B12", "D3", "K2", "MSM", "BCAA", "II", "HR"}
    words = []
    for w in name.split():
        if w.upper() in keep or re.fullmatch(r"[A-Z0-9.+-]{2,}\d", w):
            words.append(w.upper() if w.upper() in keep else w)
        else:
            words.append(w.capitalize() if w.isupper() else w)
    return " ".join(words)


BRANDS = [
    "Healthy America", "Healthy Sports", "GreenWorld", "Natural Health", "Nutrición Celular", "Funat",
    "ProScience", "Proscience", "GMN", "Loli Cham", "Siluet", "Nutrex", "Muscletech", "MuscleTech",
    "Iron Nutrition", "Old School Labs", "Raw Series", "Lab Grade", "BiPro", "MaryRuth's", "Toplux",
    "MicroIngredients", "American Blue", "Natural Medix", "NaturTeck", "Natural Freshly", "Ledmar",
    "Greensofe", "Satoomi", "Active Plus", "Maximum Care", "TestoUltra", "Monster Test", "Redumex",
    "NutriPlan", "HGW", "Lipomax", "Lipo Bloom",
]
BRAND_CANON = {"Proscience": "ProScience", "Muscletech": "MuscleTech", "Greensofe": "Greensofg"}


def detect_brand(name):
    for b in BRANDS:
        if b.lower() in name.lower():
            return BRAND_CANON.get(b, b)
    return None


# --- Categorias: se agregan 2 nuevas para El Oasis
categories = [dict(c) for c in current["categories"]]
extra_categories = [
    {"slug": "deportivos", "name": "Nutrición deportiva", "tagline": "Creatinas, proteínas y aminoácidos"},
    {"slug": "cuidado", "name": "Cuidado personal", "tagline": "Cremas, jabones y uso tópico"},
]
for c in extra_categories:
    if c["slug"] not in {x["slug"] for x in categories}:
        c["sort_order"] = len(categories)
        categories.append(c)


def category_for(src, d):
    pres = f"{d['cant'] or ''} {d['pres'] or ''}".lower()
    name = d["prod"].lower()
    sec = (d["section"] or "").lower()
    if src == "EO":
        if "creatina" in sec or ("prote" in sec and re.search(r"\d\s*(g|lb)\b|polvo", pres) and "cápsula" not in pres):
            return "deportivos"
        if re.search(r"crema|jab[oó]n|t[oó]pic|soap", name + pres) and "potencial" not in sec:
            return "cuidado"
        if "testoster" in sec and not re.search(r"c[aá]psul|softgel|perla|tableta", pres):
            return "potencializadores"
    if re.search(r"gomita|goma|masticable", pres + name):
        return "gomas"
    if re.search(r"gotas|\b20 ?ml\b|\b30 ?ml gotas", pres):
        return "gotas"
    if re.search(r"t[oó]pico", pres):
        return "cuidado"
    if "potencializador" in pres:
        return "potencializadores"
    if re.search(r"bebida", pres):
        return "bebidas"
    if re.search(r"c[aá]psul|softgel|perla|tableta|unidades", pres):
        return "capsulas"
    if re.search(r"fibra", name) and re.search(r"\d\s*g", pres):
        return "fibras"
    if re.search(r"\d\s*(g|lb|kg)\b|polvo|efervescente|sachet|sobre|tisana", pres):
        return "polvos"
    if re.search(r"ml|jarabe|litro|frasco", pres):
        return "jarabes"
    return "capsulas"


NEEDS = [
    ("masculina", r"sexual|libido|erecc|masculin|pr[oó]stat|testoster|potencia|virilidad|orgasm"),
    ("mujer", r"menopaus|menstrua|ovari|femenin|mujer|hormonal|sop\b|fertilidad"),
    ("sueno", r"sueño|insomnio|estr[eé]s|ansiedad|nervios|relaja|melatonina"),
    ("digestion", r"digest|colon|estreñ|intestin|h[ií]gado|hep[aá]t|ri[ñn][oó]n|c[aá]lculo|peso|grasa|adelgaz|obesidad|abdomen|detox|desintox|purg|laxante|gastritis|glucosa|diabet|colesterol|triglic"),
    ("huesos", r"articula|hueso|artritis|artrosis|osteo|cart[ií]lago|dolor|muscular|calambre|calcio"),
    ("belleza", r"piel|cabello|uñas|arrugas|antiedad|envejec|col[aá]geno|belleza|celulitis"),
    ("mente", r"memoria|concentraci|cerebr|cognitiv|mental|circulaci|coraz|cardiovascular|presi[oó]n"),
    ("defensas", r"defensa|inmun|gripa|gripe|tos\b|respirat|bronquio|infecci|alergia"),
    ("energia", r"energ|cansancio|fatiga|rendimiento|deport|m[uú]scul|fuerza|anemia|vitamina|apetito|crecimiento"),
]


def need_for(text, section):
    t = text.lower()
    for slug, rx in NEEDS:
        if re.search(rx, t):
            return slug
    sec = (section or "").lower()
    for key, slug in [("creatina", "energia"), ("prote", "energia"), ("col", "belleza"), ("magnesio", "huesos"),
                      ("maca", "energia"), ("adelgaz", "digestion"), ("vitamina", "energia"), ("omega", "mente"),
                      ("testoster", "masculina"), ("probi", "digestion"), ("antioxid", "defensas"),
                      ("purgante", "digestion"), ("cabello", "belleza"), ("articula", "huesos")]:
        if key in sec:
            return slug
    return "energia"


def save_photo(src_jpg, filename):
    """Miniatura del Excel -> webp. Se amplia a 300 px de alto para que no quede diminuta en la tienda."""
    im = Image.open(os.path.join(HERE, "img", src_jpg)).convert("RGB")
    h = 300
    im = im.resize((max(1, round(im.width * h / im.height)), h), Image.LANCZOS)
    im.save(os.path.join(MEDIA, filename), "WEBP", quality=88)


def make_placeholder(name, filename):
    """Tarjeta neutra cuando la foto del Excel no es confiable: nombre del producto y 'Foto proximamente'."""
    from PIL import ImageDraw, ImageFont
    im = Image.new("RGB", (600, 600), (244, 241, 234))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([40, 40, 560, 560], radius=36, outline=(30, 70, 50), width=4)
    font = ImageFont.truetype("arialbd.ttf", 40)
    small = ImageFont.truetype("arial.ttf", 28)
    words, lines, line = name.split(), [], ""
    for w in words:
        if d.textlength(f"{line} {w}".strip(), font=font) > 440:
            lines.append(line); line = w
        else:
            line = f"{line} {w}".strip()
    lines.append(line)
    y = 300 - len(lines) * 26
    for ln in lines:
        d.text(((600 - d.textlength(ln, font=font)) / 2, y), ln, font=font, fill=(30, 70, 50)); y += 52
    msg = "Foto próximamente"
    d.text(((600 - d.textlength(msg, font=small)) / 2, y + 24), msg, font=small, fill=(110, 120, 110))
    im.save(os.path.join(MEDIA, filename), "WEBP", quality=90)


def restore_old_image(filename):
    dest = os.path.join(MEDIA, filename)
    if os.path.exists(dest):
        return True
    for commit in ("5df8132", "1991201"):
        path = f"app/frontend/public/media/products/{filename}"
        r = subprocess.run(["git", "-C", REPO, "show", f"{commit}:{path}"], capture_output=True)
        if r.returncode == 0:
            open(dest, "wb").write(r.stdout)
            return True
    return False


def next_ref(prefix, used):
    n = max([int(r.split("-")[1]) for r in used if r.startswith(prefix + "-")] + [0]) + 1
    while f"{prefix}-{n:03d}" in used:
        n += 1
    return f"{prefix}-{n:03d}"


used_refs = set(cur) | set(old)
products, report = [], {"reused": [], "new": [], "restored": [], "skipped": [], "inactive_rule": [], "price_fixed": [], "price_recovered": [], "price_to_ask": []}
by_key = {}
order = 0

for src, mapping in (("GLNP", GLNP), ("EO", EO)):
    for d in [r for r in rows if r["src"] == src]:
        n = nro(d)
        target = mapping[n]
        if isinstance(target, tuple):
            report["skipped"].append((src, n, d["prod"], target))
            continue
        base = cur.get(target) or old.get(target) if target != "NEW" else None
        if target != "NEW" and target not in cur:
            report["restored"].append(target)

        name_excel = clean(d["prod"])
        if src == "GLNP":
            size = clean(d["cant"])
            display = f"{title_case(name_excel)} {size}" if size and size.lower() not in name_excel.lower() else title_case(name_excel)
            brand = "Greenlab" if (d["prov"] or "").lower().startswith("green") else "Naturpro"
            presentation, fmt = size, clean(d["pres"])
            benefits = split_items(d["uso"])
            tags = split_items(d["sirve"], 12)
            desc_parts = [sentence(d["desc"])]
            cost = money(d["may"])
        else:
            display = name_excel
            brand = (base or {}).get("brand") or detect_brand(name_excel)
            presentation, fmt = clean(d["pres"]), clean(d["cant"])
            benefits = split_items(d["sirve"], 4)
            tags = split_items(d["sirve"], 12)
            desc_parts = [sentence(d["desc"])]
            if clean(d["uso"]):
                desc_parts.append("Modo de uso: " + sentence(d["uso"]))
            cost = None
        if clean(d["prec"]):
            desc_parts.append("Precauciones: " + sentence(d["prec"]))
        description = " ".join(p for p in desc_parts if p)
        price = money(d["venta"])

        if base:
            ref, slug, image = base["ref"], base["slug"], base.get("image")
            if base is old.get(target) and target not in cur:
                restore_old_image(image)
            name = base["name"] if src == "GLNP" else display
            category, need = base["category"], base["need"]
            if category not in {c["slug"] for c in categories}:
                category = category_for(src, d)
            if need not in {n["slug"] for n in current["needs"]}:
                need = need_for(f"{name} {d['sirve'] or ''}", d["section"])
            if src == "EO" and category_for(src, d) in ("deportivos", "cuidado"):
                category = category_for(src, d)
            report["reused"].append(ref)
        else:
            prefix = {"GLNP": "GL" if brand == "Greenlab" else "NP", "EO": "EO"}[src]
            ref = next_ref(prefix, used_refs)
            used_refs.add(ref)
            name = display
            slug = f"{slugify(name)[:200]}-{ref.lower()}"
            image = f"{slug}.webp"
            placeholder = src == "GLNP"  # las fotos del Excel GL/NP estan desplazadas entre productos
            if d["img"] and not placeholder:
                save_photo(d["img"], image)
            else:
                make_placeholder(name, image)
            category = category_for(src, d)
            need = need_for(f"{name} {d['sirve'] or ''} {d['uso'] or ''} {d['desc'] or ''}", d["section"])
            report["new"].append(ref)

        is_active = not (src == "EO" and n in INACTIVE_EO)
        if not is_active:
            report["inactive_rule"].append((ref, name, INACTIVE_EO[n]))

        item = {
            "ref": ref, "slug": slug, "name": name, "brand": brand,
            "supplier": brand if src == "GLNP" else "El Oasis", "category": category, "need": need,
            "type": brand, "format": fmt, "presentation": presentation,
            "is_viral": (base or {}).get("is_viral", False), "is_trending": (base or {}).get("is_trending", False),
            "invima": (base or {}).get("invima"), "benefits": benefits, "description": description,
            "advisor_tags": tags, "image": image, "has_photo": bool(base) or (src == "EO" and bool(d["img"])),
            "sort_order": order, "cost_price": cost, "supplier_store_price": (base or {}).get("supplier_store_price") if src == "GLNP" else None,
            "market_price": (base or {}).get("market_price"), "market_source": (base or {}).get("market_source"),
            "price": price, "is_active": is_active,
            "source": {"file": "inventario_GL_NP_v4.xlsx" if src == "GLNP" else "catalogo_eloasis_CON_PARA_QUE_SIRVE.xlsx", "nro": n},
        }
        if ref in PRICE_OVERRIDES:
            report["price_fixed"].append((ref, item["price"], PRICE_OVERRIDES[ref]))
            item["price"] = PRICE_OVERRIDES[ref]
        elif item["price"] is None and base:
            previous = (cur.get(ref) or {}).get("price") or (old.get(ref) or {}).get("price")
            if previous:
                item["price"] = previous
                report["price_recovered"].append((ref, name, previous))
        if item["price"] is None and is_active:
            report["price_to_ask"].append((ref, name))
        products.append(item)
        order += 1

# Productos actuales que no estan en los Excel: se conservan inactivos
kept = {p["ref"] for p in products}
retired = []
for p in current["products"]:
    if p["ref"] not in kept:
        q = dict(p)
        q["is_active"] = False
        q["sort_order"] = order
        order += 1
        products.append(q)
        retired.append(p["ref"])

current["categories"] = categories
current["products"] = products
open(SEED, "w", encoding="utf-8", newline="\n").write(json.dumps(current, indent=1, ensure_ascii=False))
json.dump({k: v for k, v in report.items()} | {"retired": retired}, open(os.path.join(HERE, "reporte.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
active = [p for p in products if p["is_active"]]
print(f"productos en catalog.json: {len(products)} | activos: {len(active)} | inactivos: {len(products) - len(active)}")
print(f"reusan Ref: {len(report['reused'])} | nuevos: {len(report['new'])} | recuperados del historial: {report['restored']} | omitidos (duplicados): {len(report['skipped'])} | retirados: {len(retired)}")
