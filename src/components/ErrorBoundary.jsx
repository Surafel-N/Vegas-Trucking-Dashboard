import React from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    try {
      window.localStorage.clear();
      window.location.reload();
    } catch (e) {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] p-6 text-white font-sans">
          <div className="w-full max-w-md rounded-[32px] border border-[#cf5d56]/20 bg-[#121212] p-8 shadow-2xl text-center">
            <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-[#cf5d56]/10 text-[#cf5d56]">
              <AlertTriangle className="size-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Oups ! Une erreur est survenue.</h1>
            <p className="mt-4 text-sm text-white/50 leading-relaxed">
              L'application a rencontré un problème inattendu. Cela peut être dû à des données locales corrompues.
            </p>
            
            <div className="mt-8 flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-white/5 px-6 py-3 text-sm font-bold border border-white/10 hover:bg-white/10 transition"
              >
                <RefreshCcw className="size-4" /> Réessayer
              </button>
              <button
                onClick={this.handleReset}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#cf5d56] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#cf5d56]/20 hover:scale-[1.02] transition active:scale-[0.98]"
              >
                <Home className="size-4" /> Réinitialiser et Accueil
              </button>
            </div>
            
            <pre className="mt-8 overflow-auto rounded-xl bg-black/40 p-4 text-left text-[10px] text-white/30 font-mono">
              {this.state.error?.toString()}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
