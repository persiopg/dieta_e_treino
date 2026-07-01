import React, { useState } from 'react';
import axios from 'axios';
import { Sparkles, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

export default function Login({ onLoginSuccess, onNavigateToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      return setError('Por favor, preencha todos os campos.');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const { token, user } = response.data;
      onLoginSuccess(token, user);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Falha ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 md:p-6 animate-fade-in mt-10">
      <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6 md:p-8 space-y-6">
        
        {/* Cabeçalho */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-10 h-10 rounded-xl bg-blue-600 dark:bg-blue-500 items-center justify-center text-white shadow-md mb-2">
            <Sparkles className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
            Acessar FitLife
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Entre com seu email e senha para ver seu planejamento diário.
          </p>
        </div>

        {/* Erro */}
        {error && (
          <div className="p-3.5 bg-rose-50/50 dark:bg-rose-950/15 border border-rose-200 dark:border-rose-900/30 text-rose-800 dark:text-rose-400 rounded-xl text-xs font-semibold leading-relaxed">
            ⚠️ {error}
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Endereço de E-mail
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
              <input
                type="email"
                placeholder="nome@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Senha de Acesso
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
              <input
                type="password"
                placeholder="Sua senha secreta"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900 font-extrabold py-3.5 rounded-xl transition-all shadow-md mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Verificando...
              </>
            ) : (
              <>
                Entrar na Conta <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Navegação entre telas */}
        <div className="text-center pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={onNavigateToRegister}
            disabled={loading}
            className="text-xs font-bold text-blue-500 hover:underline transition-all"
          >
            Não tem uma conta? Cadastre-se grátis
          </button>
        </div>

      </div>
    </div>
  );
}
