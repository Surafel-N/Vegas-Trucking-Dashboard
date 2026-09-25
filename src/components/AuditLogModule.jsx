export function AuditLogModule({ logs = [], t, language = 'FR' }) {
  const isEn = language === 'EN';
  const safeLogs = logs || [];
  return (
    <section className="rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,#161616_0%,#101010_100%)] p-5 text-white">
      <h3 className="text-xl font-semibold tracking-tight">{t?.audit || (isEn ? "Audit Log" : "Journal d'audit")}</h3>
      <p className="mt-1 text-sm text-white/50">{isEn ? "Creation/modification tracking for security and accountability." : "Trace de création/modification pour la sécurité et la responsabilité."}</p>

      <div className="mt-4 overflow-hidden rounded-[22px] border border-white/8">
        <div className="max-h-[460px] overflow-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead className="sticky top-0 bg-black/72 text-left text-xs uppercase tracking-[0.18em] text-white/44">
              <tr>
                <th className="px-4 py-3">{t?.date || "Date"}</th>
                <th className="px-4 py-3">{isEn ? "User" : "Utilisateur"}</th>
                <th className="px-4 py-3">{isEn ? "Role" : "Rôle"}</th>
                <th className="px-4 py-3">{isEn ? "Action" : "Action"}</th>
                <th className="px-4 py-3">{isEn ? "Detail" : "Détail"}</th>
              </tr>
            </thead>
            <tbody className="text-sm text-white/72">
              {safeLogs.map((log) => (
                <tr key={log.id} className="border-t border-white/6 hover:bg-white/[0.03]">
                  <td className="px-4 py-3">{log.createdAt}</td>
                  <td className="px-4 py-3 text-white">{log.userName}</td>
                  <td className="px-4 py-3">{log.userRole}</td>
                  <td className="px-4 py-3">{log.action}</td>
                  <td className="px-4 py-3">{log.detail}</td>
                </tr>
              ))}
              {!logs.length ? (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center text-white/45">{isEn ? "No audit log entries recorded." : "Aucune entrée d'audit enregistrée."}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
