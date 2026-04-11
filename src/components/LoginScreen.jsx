import React, { useState } from 'react';
import { Truck, Lock, ArrowRight } from 'lucide-react';
import { PASSWORDS } from '../utils/auth';

export default function LoginScreen({ onLogin }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const user = PASSWORDS[code.toUpperCase()]; // Accepte les minuscules/majuscules
    
    if (user) {
      onLogin(user);
    } else {
      setError('Code d\'accès invalide');
      setCode('');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#181818] p-8 shadow-2xl">
        
        <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#cf5d56]/20">
          <Truck className="size-8 text-[#cf5d56]" />
        </div>
        
        <h1 className="mb-2 text-center text-2xl font-bold">SDV Logistics</h1>
        <p className="mb-8 text-center text-sm text-white/50">Veuillez entrer votre code d'accès</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <div className="relative flex items-center">
              <Lock className="absolute left-4 size-5 text-white/40" />
              <input
                type="password"
                value={code}
                onChange={(e) => { setCode(e.target.value); setError(''); }}
                placeholder="Code secret..."
                className={`w-full rounded-xl border bg-black/50 py-3 pl-12 pr-4 text-white outline-none transition-all focus:border-[#cf5d56] focus:ring-1 focus:ring-[#cf5d56] ${
                  error ? 'border-red-500' : 'border-white/10'
                }`}
                autoFocus
              />
            </div>
            {error && <p className="mt-2 text-xs text-red-500 pl-2">{error}</p>}
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#cf5d56] py-3 font-bold text-white transition-all hover:bg-[#b04a44]"
          >
            Se connecter <ArrowRight className="size-4" />
          </button>
        </form>

      </div>
    </div>
  );
}