type StatCardProps = {
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "violet" | "emerald" | "amber";
};

const tones = {
  blue: "bg-blue-50 text-blue-700",
  violet: "bg-violet-50 text-violet-700",
  emerald: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
} as const;

export function StatCard({ label, value, detail, tone }: StatCardProps) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`grid size-9 place-items-center rounded-xl text-sm font-bold ${tones[tone]}`}>↗</span>
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{detail}</p>
    </article>
  );
}
