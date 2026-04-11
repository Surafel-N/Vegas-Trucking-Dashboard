const toneClasses = {
  teal: "border-teal-500/18 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.16),transparent_38%),linear-gradient(180deg,#181717_0%,#111111_100%)] text-white shadow-[0_24px_65px_-40px_rgba(20,184,166,0.45)]",
  red: "border-[#d45d55]/22 bg-[radial-gradient(circle_at_top_left,rgba(212,93,85,0.22),transparent_42%),linear-gradient(180deg,#181717_0%,#111111_100%)] text-white shadow-[0_24px_65px_-40px_rgba(212,93,85,0.48)]",
  green: "border-emerald-500/18 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_40%),linear-gradient(180deg,#181717_0%,#111111_100%)] text-white shadow-[0_24px_65px_-40px_rgba(16,185,129,0.45)]",
  slate: "border-white/8 bg-[linear-gradient(180deg,#171717_0%,#101010_100%)] text-white shadow-[0_24px_65px_-42px_rgba(0,0,0,0.75)]",
};

export function KpiCard({ label, value, helper, tone = "teal" }) {
  return (
    <article
      className={`panel-enter rounded-[28px] border p-5 ${toneClasses[tone]}`}
    >
      <p className="text-sm font-medium text-white/58">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-white/46">{helper}</p>
    </article>
  );
}
