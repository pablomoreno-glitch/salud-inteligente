# Mapeo revisado a mano: fila del Excel -> Ref existente, "NEW", ("DUP", otra fila) o ("SKIP_GLNP", nro GL/NP).
# GLNP: numero del Excel de Greenlab/NaturPro. EO: numero del Excel de El Oasis.

GLNP = {
    1: "GL-001", 2: "GL-027", 3: "GL-030", 4: "NEW", 5: "NP-017", 6: "NP-028", 7: "GL-019", 8: "GL-040",
    9: "NP-052", 10: "GL-005", 11: "GL-038", 12: "NP-055", 13: "NP-056", 14: "NP-050", 15: "NP-019",
    16: "NP-035", 17: "NP-061", 18: "GL-015", 19: "NP-049", 20: "GL-016", 21: "NP-058", 22: "NP-001",
    23: "NP-027", 24: "GL-035", 25: "GL-036", 26: "NP-046", 27: "NP-047", 28: "NP-048", 29: "GL-029",
    30: "GL-010", 31: "NP-006", 32: "NP-008", 33: "NP-024", 34: "NP-007", 35: "GL-002", 36: "GL-003",
    37: "GL-004", 38: "GL-006", 39: "GL-007", 40: "GL-008", 41: "GL-009", 42: "GL-011", 43: "GL-012",
    44: "GL-020", 45: "NEW", 46: "GL-013", 47: "GL-024", 48: "GL-025", 49: "GL-023", 50: "GL-021",
    51: "GL-022", 52: "GL-028", 53: "GL-031", 54: "GL-032", 55: "GL-033", 56: "GL-034", 57: "GL-014",
    58: "GL-017", 59: "GL-018", 60: "NP-002", 61: "NP-003", 62: "NP-004", 63: "NP-005", 64: "NP-009",
    65: "NP-010", 66: "NP-011", 67: "NP-012", 68: "NP-013", 69: "NP-014", 70: "NP-015", 71: "NP-018",
    72: "NP-020", 73: "NP-021", 74: "NP-022", 75: "NP-023", 76: "NP-025", 77: "NP-026", 78: "NP-037",
    79: "NP-038", 80: "NP-039", 81: "NP-040", 82: "NP-042", 83: "NP-043", 84: "NP-044", 85: "NP-045",
    86: "NP-032", 87: "NP-062", 88: "NP-057", 89: "NP-059", 90: "NP-016", 91: "NP-030", 92: "NP-031",
    93: "NP-029",
}

EO = {
    1: "NV-111", 4: "NEW", 6: "NEW", 7: "NV-112", 8: "NEW", 9: "NV-093", 10: "NV-104", 12: "NV-119", 14: "NEW",
    16: "NEW", 17: "NV-080", 18: ("SKIP_GLNP", 6), 20: "NV-024", 21: "NEW", 22: "NH-225", 24: "LN-75",
    26: "NV-077", 27: "NEW", 28: "NV-061", 30: "NV-017", 31: "NV-097", 33: "NV-036", 34: "NV-065",
    36: "NV-032", 37: "NV-123", 38: "LN-74", 40: "NV-038", 41: "NEW", 43: "NH-186", 44: "NV-098",
    45: "NV-006", 46: "VW-259", 48: "NV-118", 49: "NEW", 51: "NV-064", 52: "NV-075", 53: "NV-020",
    54: "NEW", 56: "NV-042", 57: "NV-127", 58: ("DUP", 46), 60: "NV-012", 61: "NV-122", 62: "NV-120",
    63: "NEW", 64: "NV-117", 65: ("DUP", 129), 67: "NV-110", 68: "NEW", 69: "NEW", 70: "NV-013", 73: "NV-116",
    76: "NV-007", 78: "NV-102", 79: "NV-126", 80: ("SKIP_GLNP", 16), 81: "NEW", 82: "NH-95", 83: "NV-018",
    84: "NV-060", 85: "NV-063", 86: "NV-015", 87: "NEW", 89: "NEW", 90: "NEW", 91: "NEW", 92: "NEW",
    93: "NV-081", 94: "NH-103", 95: "NEW", 96: ("SKIP_GLNP", 92), 97: "NV-091", 100: "NEW", 102: "NEW",
    103: "NEW", 105: "NV-101", 107: "NV-079", 108: "NV-072", 109: "NV-073", 112: "NEW", 113: "NEW",
    115: "NEW", 116: "NV-078", 117: "NEW", 118: "NEW", 120: "NV-095", 121: "NEW", 122: "NV-092",
    125: "NV-090", 126: "NV-087", 127: "NEW", 128: "NV-105", 129: "NV-037", 130: "NV-062", 131: "NV-002",
    133: "NEW", 134: ("DUP", 28), 135: "NV-014", 137: ("SKIP_GLNP", 86), 139: "NV-043", 140: "NEW",
    141: "NH-98", 143: "NEW", 144: ("SKIP_GLNP", 68), 145: ("SKIP_GLNP", 92), 146: "NV-083", 148: "NV-085",
    149: "NEW", 150: "NEW", 151: "NV-033", 152: ("DUP", 131), 153: "NEW", 154: "NEW", 155: "NV-074",
    158: "NV-040", 159: "NV-084", 160: "NEW", 161: "NV-004", 162: ("DUP", 161), 163: "NV-113", 164: "NV-128",
    165: "NEW", 166: ("SKIP_GLNP", 78), 167: ("SKIP_GLNP", 79), 169: "NV-106", 171: "NEW", 173: "NEW",
    174: "NEW", 175: "NV-067", 176: "NEW", 177: "NV-016", 179: "NV-108", 180: "NEW", 181: "NEW",
    182: "NV-069", 184: ("SKIP_GLNP", 83), 185: ("SKIP_GLNP", 61), 186: "NV-029", 188: "LN-1",
    189: "NV-068", 190: "NV-001", 191: "NV-041", 193: "NV-052", 194: ("SKIP_GLNP", 32), 195: "NV-070",
    196: "NV-109", 197: "NV-100", 199: ("DUP", 79), 200: "NV-023", 201: "NV-008", 203: "NV-003",
    204: "NV-088", 205: "NV-094", 207: ("DUP", 83), 208: "NV-035", 209: "NEW", 210: "NV-066", 211: "NV-121",
    212: "NH-236", 213: "NEW", 214: "NH-97", 215: "NV-005", 216: ("DUP", 215), 219: "NV-114",
    220: ("DUP", 92), 221: "NEW", 222: "NV-086", 223: "NV-096", 224: "NV-019", 227: ("DUP", 224),
    228: "NEW", 229: "NV-071", 230: "NEW", 231: "NV-099", 232: "NEW", 233: "NH-94", 234: "NV-103",
    236: "NEW", 238: ("DUP", 230), 239: "NV-124", 240: "NEW", 241: "NEW", 242: "NV-089", 243: "NEW",
    244: "NV-021", 245: "NV-009", 247: "NEW", 248: "NEW", 254: "NV-107", 255: "NV-022", 256: "NV-115",
    257: "NEW", 258: "NEW", 259: "NEW", 260: "NEW", 261: "NH-184", 262: "NEW", 263: "NEW", 264: "NEW",
    265: "NEW", 267: "NEW", 268: "NV-125", 269: "NEW",
}

# Cargados pero ocultos: no son suplementos para vender en la tienda.
INACTIVE_EO = {
    143: "Vibazina (buclizina) es un medicamento, no un suplemento dietario",
    260: "Display Suplementos Eloasis es el exhibidor de la tienda, no un producto",
}

# Precios del Excel de El Oasis que eran errores de digitacion: se usa el precio del catalogo anterior.
PRICE_OVERRIDES = {
    "NV-103": 10000,  # Geolax Purgante Natural (Excel: $95.000)
    "NV-099": 22000,  # Bilalax sobre 20 g (Excel: $85.000)
    "NV-077": 38000,  # Colageno Hidrolizado y Cloruro de Magnesio (Excel: $95.000)
    "NV-089": 60000,  # Cucuma con colageno y vitaminas Natural Health (Excel: $22.000)
}
