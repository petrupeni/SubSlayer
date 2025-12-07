'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const router = useRouter();

    // Lazily create Supabase client only when needed (client-side)
    const getSupabase = useMemo(() => {
        if (typeof window === 'undefined') return null;
        // Dynamic import to prevent SSR issues
        const { createClient } = require('@/lib/supabase');
        return createClient();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!getSupabase) {
            setError('Authentication service unavailable');
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            if (mode === 'signup') {
                const { error } = await getSupabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/`,
                    },
                });

                if (error) throw error;

                setSuccess('Check your email for the confirmation link!');
            } else {
                const { error } = await getSupabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) throw error;

                router.push('/');
                router.refresh();
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8 fade-in">
                    <h1 className="text-4xl md:text-5xl font-bold glow-text mb-2 tracking-wider">
                        SUB<span className="text-red-500">SLAYER</span>
                    </h1>
                    <p className="text-matrix-darkgreen text-sm">
                        Access your subscription dashboard
                    </p>
                </div>

                {/* Auth Card */}
                <div className="matrix-card card-glow fade-in" style={{ animationDelay: '0.1s' }}>
                    {/* Mode Toggle */}
                    <div className="flex mb-6 border border-matrix-darkgreen rounded-lg overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setMode('login')}
                            className={`flex-1 py-3 text-sm font-medium uppercase tracking-wider transition-all ${mode === 'login'
                                    ? 'bg-matrix-green text-matrix-black'
                                    : 'text-matrix-darkgreen hover:text-matrix-green'
                                }`}
                        >
                            Login
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('signup')}
                            className={`flex-1 py-3 text-sm font-medium uppercase tracking-wider transition-all ${mode === 'signup'
                                    ? 'bg-matrix-green text-matrix-black'
                                    : 'text-matrix-darkgreen hover:text-matrix-green'
                                }`}
                        >
                            Sign Up
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-matrix-darkgreen text-xs uppercase tracking-wider mb-2">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-matrix"
                                placeholder="agent@matrix.io"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-matrix-darkgreen text-xs uppercase tracking-wider mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-matrix"
                                placeholder="••••••••"
                                required
                                minLength={6}
                                disabled={isLoading}
                            />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-3 bg-red-900/30 border border-red-500 rounded-lg text-red-400 text-sm">
                                ⚠ {error}
                            </div>
                        )}

                        {/* Success Message */}
                        {success && (
                            <div className="p-3 bg-green-900/30 border border-green-500 rounded-lg text-green-400 text-sm">
                                ✓ {success}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="btn-matrix w-full min-h-[48px] flex items-center justify-center gap-2"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <div className="spinner"></div>
                                    <span>Processing...</span>
                                </>
                            ) : (
                                <>
                                    <span>⚡</span>
                                    <span>{mode === 'login' ? 'Enter The Matrix' : 'Create Account'}</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <p className="text-center text-matrix-darkgreen text-xs mt-6">
                        {mode === 'login'
                            ? "Don't have an account? Click Sign Up above"
                            : 'Already have an account? Click Login above'}
                    </p>
                </div>

                {/* Security Note */}
                <p className="text-center text-matrix-darkgreen text-xs mt-6 opacity-50">
                    🔒 Secured by Supabase Auth
                </p>
            </div>
        </main>
    );
}
