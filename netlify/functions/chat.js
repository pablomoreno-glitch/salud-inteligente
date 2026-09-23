const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5";
const MAX_TOKENS = 1024;
const MAX_HISTORY = 20;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(statusCode, data, extraHeaders = {}) {
  return {
    statusCode,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json", ...extraHeaders },
    body: JSON.stringify(data),
  };
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Método no permitido. Usa POST." }, { Allow: "POST, OPTIONS" });
  }

  let body;
  try {
    body = JSON.parse(event.body || "");
  } catch {
    return json(400, { error: "El cuerpo de la petición no es un JSON válido." });
  }

  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    return json(400, { error: "El campo \"messages\" es obligatorio y debe ser un arreglo con al menos un mensaje." });
  }

  const validMessage = (m) =>
    m && (m.role === "user" || m.role === "assistant") &&
    (typeof m.content === "string" || Array.isArray(m.content));
  if (!body.messages.every(validMessage)) {
    return json(400, { error: "Cada mensaje debe tener \"role\" (user | assistant) y \"content\"." });
  }

  // Solo los últimos MAX_HISTORY mensajes; la API exige que el primero sea del usuario.
  const messages = body.messages.slice(-MAX_HISTORY);
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (messages.length === 0) {
    return json(400, { error: "La conversación debe incluir al menos un mensaje del usuario." });
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    console.error("[chat] Falta la variable de entorno ANTHROPIC_API_KEY");
    return json(500, { error: "El asesor no está configurado en el servidor. Intenta más tarde." });
  }

  const CATALOG = `CATÁLOGO DE SUPLEMENTOS DISPONIBLES:

SUEÑO/ESTRÉS/ANSIEDAD: Magnesium Complex 8en1 (VW-158,VW-259,VW-261) - reduce estrés y mejora sueño; Magnesium Complex 12en1 (VW-157,VW-262) - calambres y tensión muscular; Citrato Magnesio y Potasio Greensofg (LN-74) - sueño, estrés, función muscular; Gomas Magnesio+Melatonina (NH-186) - calidad del sueño e insomnio; Bisglicinato (NH-230) - relajación y sueño; Glicinato Magnesio Alphanaturals (AL-4) - estrés y sueño profundo; Ashwagandha Colon Max (CM-14) - estrés, ansiedad, cortisol, descanso; Ashwagandha Natural Health (NH-90) - estrés, sueño, concentración; Goma Ashwagandha+Magnesio+VitC (NH-181) - estrés, energía, inmunidad; Valeriana+Toronjil+Pasiflora (IM-43) - sueño, estrés, nerviosismo; Citrato Magnesio Natural Health (NH-92) - calambres, electrolitos; Cloruro Magnesio Natural Health (NH-93) - función muscular y nerviosa.

ENERGÍA/RENDIMIENTO FÍSICO: L-Carnitine líquido (VW-156) - energía y resistencia; Creatine Vitalherb 500g (VW-154) - fuerza y potencia muscular; Creatine x350g (VW-235) - fuerza y rendimiento; Proteína Shilajit Whey (VW-222) - proteína isolada 90%; Lemme Burn (QS-212) - metabolismo energético; Shilajit cápsulas (VW-160) - energía vitalidad y libido; Shilajit compota (LN-68) y sachet (LN-69) - energía y vitalidad; Shilajit líquido 1000ml (NH-191) - energía y resistencia; Té Matcha (NH-102) - energía, concentración y metabolismo; Triple Maca (NH-103) - energía, equilibrio hormonal, libido; Maca Negra+Roja (NP-129) - energía y resistencia; KOMB (NP-128) - energía y vitalidad; INVICTUS (GE-211) - rendimiento físico y concentración; Torovitol (NP-130), Enano 180 (BE-5), Bulls Maxx (GE-29) - energía y vitalidad.

ARTICULACIONES/HUESOS/MOVILIDAD: Flexacil Ultra (VW-155) - articulaciones flexibles y ágiles; Vitamina D3+K2 bolsa (PS-137) y frasco (PS-233) - calcio, huesos y dientes; Trigosamine (IM-47) - huesos y articulaciones, reduce dolor y rigidez; Reuma Flex (CL-8) - dolor articular y muscular, artritis, artrosis; Collagen Peptides (VW-150) - articulaciones y huesos; Glucosamina líquida (NL-208) - salud articular con glucosamina y condroitín; Barr1do Art (LN-62) - articulaciones, rigidez y movilidad; Cartical Nutri Pluss (NL-107) - cartílagos y articulaciones; Cal-D3 (NL-106, NL-234) - huesos y dientes, osteoporosis; Omega 3 Greensofg (LN-33) y 3,6,9 (LN-34) - inflamación y dolor articular; Xingrass gel (CL-9) y Flexdl gel (IM-41) - dolor muscular y articular tópico.

PIEL/CABELLO/UÑAS/BELLEZA: Collagen Peptides (VW-150) - elasticidad y firmeza de piel, cabello y uñas; Liposomal Vitamina C (VW-151) - colágeno, antioxidante, piel y uñas; Colágeno Hidrolizado Greensofg (LN-75) - piel firme y elástica con biotina; Con Biotina Greensofg (LN-76) - cabello, piel y uñas, reduce caída; Vitamina E+Selenio (LN-84) - antioxidante celular y piel; Colágeno+Biotina Colon Max (CM-19) - cabello y uñas; Resveratrol Greensofg (LN-83) - antioxidante, piel y envejecimiento; Femivid (IM-40) - biotina, ácido fólico, B12; Gomitas Siemprebell (NH-95) - belleza femenina y equilibrio hormonal; NAD+Resveratrol (LN-82) - energía celular y envejecimiento saludable; Colágeno+Cúrcuma Nutri Pluss (NL-179) - piel firme; múltiples colágenos marinos e hidrolizados disponibles.

DIGESTIÓN/INTESTINO/FLORA: FOS Probióticos+Zinc (LN-1) - pH íntimo, salud vaginal, flora intestinal; URO Vital World (VW-266) - tracto urinario, digestión, flora; Col-Nclin (NH-94) - limpieza intestinal; Maxi Clean (CM-21) - digestión y tránsito; Batido Verde Vitalys (VC-161) y Colon Max (CM-15) - digestión, desintoxicación; Pitahaya (VC-162), Psyllium (VC-163) - tránsito intestinal; Semilla Aguaje (NH-101) - saciedad, digestión y glucosa; QB Max (NH-99) - limpieza del colon; Fibraplus (IS-54), Lasskol (IS-57) - estreñimiento; Inositol Efervescente (CO-11) y Greensofg (LN-81) - SOP y equilibrio hormonal; Clorofila (múltiples) - desintoxicación y digestión; Bililax (NP-257) - digestión e hígado; Candida Cleanse (VW-153) - flora intestinal.

CONTROL DE PESO/METABOLISMO: Lemme Burn (QS-212) - metabolismo energético; Semilla Aguaje (NH-101) - saciedad y control apetito; Té Matcha (NH-102) - acelera metabolismo; Batidos verdes (múltiples) - control de peso; Psyllium (VC-163) - fibra y saciedad; Blood Sugar Vital World (VW-149, VW-260) - glucosa y picos de azúcar; Greenberry (IS-56) - metabolismo y peso; Ultradoll (IS-59) - control de peso y diurético; DIA-V-TIC (LN-204) - glucosa; Gomas Vinagre Manzana (NH-213) - digestión, apetito y glucosa.

INMUNIDAD/DEFENSAS: Liposomal Vitamina C (VW-151) - inmunidad; Vitamina D3+K2 - sistema inmune; Betaglucano Ganoderma (NH-91) - inmunidad y antiinflamatorio; Oil of Oregano frasco (PS-133) y bolsa (PS-134) - antibacteriano y antimicrobiano; Orégano Colon Max (CM-24) - digestión e inmunidad; Factor Transferencia (NL-113, NL-180, NL-242) - sistema inmunológico; Nutra Factors (IM-46) - calostro bovino y probióticos; Proxx (IS-58) - defensas y vías respiratorias; Bronco X Max (IM-37) - tos y expectorante; Ucalizan niños (NM-124) - tos y garganta infantil.

CONCENTRACIÓN/MEMORIA/CEREBRO: NAD+Resveratrol (NH-97, NH-236) - energía celular y concentración; Melena de León (NH-105) - memoria y sistema nervioso; Ginkgo Biloba Alnature (IM-167) y Nutri Pluss (NL-115) - memoria y circulación cerebral; Vino Cerebral Prosimpo (NL-120) - memoria y rendimiento mental; Vitacerebrina (NL-217) - energía y salud cognitiva; Omega 3 Greensofg (LN-33) - concentración y rendimiento mental.

EQUILIBRIO HORMONAL/MUJER: Inositol Efervescente (CO-11), Greensofg (LN-81) y gomas (NH-184) - SOP, ciclo menstrual, equilibrio hormonal; Isoflavonas Greensofg (LN-168) y Soya Prame (PS-245) - menopausia y síntomas premenstruales; Femvit Ovaries Prosimpo (NL-114) - hormonas femeninas, ansiedad y sueño; Femivid (IM-40) - biotina y ácido fólico; Gomitas Siemprebell (NH-95) - belleza y equilibrio hormonal; Triple Maca (NH-103) - equilibrio hormonal y libido.

PRÓSTATA/SALUD MASCULINA: Pumpking Semillas Calabaza frasco (PS-135) y bolsa (PS-136) - próstata y salud urinaria; Improtec (IM-44) - próstata y flujo urinario; Finpros (IS-55) - próstata e inflamación prostática; Prostamax (NL-117) - próstata y antioxidante; Citra-Pot Men's Alphanaturals (AL-3) - testosterona, zinc y fertilidad.

ANTIENVEJECIMIENTO/ANTIOXIDANTE: Resveratrol Greensofg (LN-83) - antioxidante y cardiovascular; NAD+Resveratrol Greensofg (LN-82) - energía celular y antioxidante; Vitamina E+Selenio (LN-84) - antioxidante y piel; Liposomal Vitamina C (VW-151) - antioxidante y colágeno.

NIÑOS: Nutri Pluss Kids (NL-207) - crecimiento y vitaminas; Aptmax Niños (CM-13) - desarrollo e inmunidad; Creci Fuerte (CM-20) - sistema inmune y digestivo; Ninosten polvo (SU-209) y líquido (SU-231) - inmunidad y desarrollo; Avena Kids (NA-220) - desarrollo cerebral con EPA y DHA; Nutra-kist (IS-49) - inmunidad y concentración escolar; Golkds HR (NP-239) - huesos, inmunidad y energía; Vitcalpro (NH-240) - vitaminas y minerales.

CARDIOVASCULAR/ANEMIA: Omega 3 (múltiples) - triglicéridos y corazón; Perlas Ajo Rogoff (IM-42) - cardiovascular y colesterol; Ajovit (LN-60) - circulación e inmunidad; Circulan (IS-50) - circulación sanguínea; Ferrohenoslin (GE-251) - anemia y transporte de oxígeno; Hierro Aminoquelado Prosimpo (PR-227) - anemia y energía.

HÍGADO/DESINTOXICACIÓN: Dren Hepatol (NL-112) - hígado y drenante; Bililax (NP-257) - digestión, hígado y colesterol; Drehep (LN-258) - desintoxicación y digestión; Alcachofa Suminat (SU-248) - salud hepática; Zarmit (LN-71), Extravid (LN-65) - depuración y hígado.

MIGRAÑA/DOLOR: Migra Max Prosimpo (NL-199) - migrañas y dolores de cabeza; Reuma Flex (CL-8) - dolor articular y muscular; Xingrass gel (CL-9) y Flexdl gel (IM-41) - dolor tópico.

GLUCOSA/AZÚCAR EN SANGRE: Blood Sugar Vital World (VW-149, VW-260) - equilibrio de glucosa; DIA-V-TIC (LN-204) - niveles de glucosa; Gomas Vinagre Manzana (NH-213) - glucosa y apetito.`;

  const SYSTEM = `Eres un asesor de bienestar natural amigable para una tienda de suplementos en Colombia. Tu trabajo es escuchar síntomas o necesidades del cliente y recomendar productos del catálogo.

AVISO DE SALUD (obligatorio, normativa INVIMA):
- Los productos del catálogo son SUPLEMENTOS DIETARIOS, NO son medicamentos. Nunca digas que curan, tratan o previenen enfermedades.
- No diagnosticas enfermedades ni reemplazas la consulta médica.
- Si el cliente menciona síntomas graves o persistentes, embarazo o lactancia, que toma medicamentos, o si la consulta es para un niño o niña, recomiéndale expresamente consultar a un profesional de la salud antes de tomar cualquier suplemento.

REGLAS IMPORTANTES:
1. NUNCA diagnostiques enfermedades ni reemplaces al médico. Ante condiciones médicas serias, recomienda siempre ver un profesional de salud.
2. Recomienda MÁXIMO 3 o 4 productos — los más relevantes para lo que describe el cliente.
3. Sé cálido, empático y usa lenguaje colombiano natural y cercano.
4. Para cada producto explica brevemente POR QUÉ es bueno para lo que describió el cliente.
5. SIEMPRE termina tu respuesta con el bloque JSON en este formato exacto (sin espacios extra):
RECS:[{"ref":"VW-158","nombre":"Magnesium Complex 8 en 1","razon":"Reduce el estrés y mejora la calidad del sueño"},{"ref":"CM-14","nombre":"Ashwagandha Colon Max","razon":"Equilibra el cortisol, ideal para ansiedad y descanso"}]
6. Si el cliente saluda o hace preguntas generales sin síntomas, responde con amabilidad y pide que describa qué busca. En ese caso NO incluyas el bloque RECS.
7. Responde siempre en español colombiano.

${CATALOG}`;

  try {
    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM,
        messages,
      }),
    });

    const apiData = await apiRes.json().catch(() => null);

    if (!apiRes.ok || !apiData) {
      // Solo se registra el estado y el error que devuelve Anthropic, nunca la API key ni los headers.
      console.error("[chat] Error de la API de Anthropic", {
        status: apiRes.status,
        model: MODEL,
        type: apiData?.error?.type,
        message: apiData?.error?.message,
      });
      return json(502, { error: "El asesor no está disponible en este momento. Intenta de nuevo en unos minutos." });
    }

    return json(200, apiData);
  } catch (err) {
    console.error("[chat] Error al contactar la API de Anthropic:", err.message);
    return json(502, { error: "El asesor no está disponible en este momento. Intenta de nuevo en unos minutos." });
  }
};
