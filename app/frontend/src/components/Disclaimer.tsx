export const DISCLAIMER_TEXT =
  "Son suplementos dietarios, no medicamentos. El asesor no diagnostica ni reemplaza la consulta médica. Ante síntomas graves o persistentes, embarazo o lactancia, uso de medicamentos o consultas para niños, consulta a un profesional de la salud.";

export function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <p className={`text-meta text-muted ${className}`}>{DISCLAIMER_TEXT}</p>
  );
}

export function DisclaimerBox({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-card border border-line bg-sage/60 p-4 text-meta text-muted ${className}`}
    >
      {DISCLAIMER_TEXT}
    </div>
  );
}
