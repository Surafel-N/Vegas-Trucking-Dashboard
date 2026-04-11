import { Lock, ShieldCheck, UserRound } from "lucide-react";
import { ROLE_LABELS } from "../utils/auth";

export function LoginPage({
  username,
  password,
  role,
  error,
  onUsernameChange,
  onPasswordChange,
  onRoleChange,
  onSubmit,
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(207,93,86,0.18),transparent_35%),linear-gradient(180deg,#0f0f11_0%,#050505_100%)] px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <section className="grid gap-6 rounded-[34px] border border-white/8 bg-[linear-gradient(180deg,#181818_0%,#101010_100%)] p-6 text-white shadow-[0_34px_90px_-52px_rgba(0,0,0,0.96)] lg:grid-cols-[1.05fr,0.95fr]">
          <article className="rounded-[30px] border border-white/8 bg-black/18 p-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#cf5d56]/24 bg-[#cf5d56]/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[#ff8f84]">
              <ShieldCheck className="size-3.5" />
              Secure Access
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">Portail comptable transport</h1>
            <p className="mt-3 max-w-md text-sm text-white/54">
              Authentification rolee pour administrateur, gestionnaire et consultation. Toutes les actions sensibles sont
              tracees dans le journal d'audit.
            </p>
            <div className="mt-6 space-y-3">
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <div key={value} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/68">
                  {label}
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[30px] border border-white/8 bg-black/18 p-6">
            <h2 className="text-2xl font-semibold tracking-tight">Connexion</h2>
            <p className="mt-1 text-sm text-white/50">Compte de demo: `admin/admin123` (ou `admin/admin`), `gestion/gestion123`, `lecture/lecture123`.</p>

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <label className="block space-y-2">
                <span className="text-sm text-white/56">Identifiant</span>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/38" />
                  <input
                    value={username}
                    onChange={(event) => onUsernameChange(event.target.value)}
                    className="h-11 w-full rounded-xl border border-white/8 bg-[#090909] pl-10 pr-3 text-sm outline-none transition focus:border-[#cf5d56]"
                    placeholder="admin"
                  />
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-sm text-white/56">Mot de passe</span>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/38" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => onPasswordChange(event.target.value)}
                    className="h-11 w-full rounded-xl border border-white/8 bg-[#090909] pl-10 pr-3 text-sm outline-none transition focus:border-[#cf5d56]"
                    placeholder="********"
                  />
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-sm text-white/56">Role attendu</span>
                <select
                  value={role}
                  onChange={(event) => onRoleChange(event.target.value)}
                  className="h-11 w-full rounded-xl border border-white/8 bg-[#090909] px-3 text-sm outline-none transition focus:border-[#cf5d56]"
                >
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              {error ? <p className="rounded-xl border border-[#cf5d56]/26 bg-[#cf5d56]/10 px-3 py-2 text-sm text-[#ffb2ab]">{error}</p> : null}

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full border border-[#cf5d56]/45 bg-[#cf5d56] px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
              >
                Se connecter
              </button>
            </form>
          </article>
        </section>
      </div>
    </div>
  );
}
