export function ChartCard({ title, description, children, className = "" }) {
  return (
    <section
      className={`panel-enter rounded-[30px] border border-white/7 bg-[linear-gradient(180deg,#171717_0%,#101010_100%)] p-5 text-white shadow-[0_35px_90px_-50px_rgba(0,0,0,0.92)] xl:p-6 ${className}`}
    >
      <div className="mb-5">
        <h3 className="text-lg font-semibold tracking-tight text-white">{title}</h3>
        <p className="mt-1 text-sm text-white/48">{description}</p>
      </div>
      {children}
    </section>
  );
}
