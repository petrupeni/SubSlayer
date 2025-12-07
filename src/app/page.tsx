'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Subscription, ParsedSubscription } from '@/types';
import { ToastProvider, useToast } from '@/components/Toast';
import SubscriptionCard from '@/components/SubscriptionCard';
import EmptyState from '@/components/EmptyState';

function getDaysUntilRenewal(renewalDate: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const renewal = new Date(renewalDate);
    renewal.setHours(0, 0, 0, 0);
    const diffTime = renewal.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function DashboardContent() {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [emailText, setEmailText] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState<ParsedSubscription | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const router = useRouter();
    const { showToast } = useToast();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Lazily create Supabase client only when needed (client-side)
    const supabase = useMemo(() => {
        if (typeof window === 'undefined') return null;
        const { createClient } = require('@/lib/supabase');
        return createClient();
    }, []);

    // Fetch subscriptions from Supabase
    const fetchSubscriptions = useCallback(async () => {
        if (!supabase) return;

        try {
            const { data, error } = await supabase
                .from('subscriptions')
                .select('*')
                .neq('status', 'cancelled') // Don't show cancelled subscriptions
                .order('renewal_date', { ascending: true });

            if (error) {
                console.error('Error fetching subscriptions:', error);
                showToast('Failed to load subscriptions', 'error');
            } else {
                setSubscriptions(data || []);
            }
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast]);

    useEffect(() => {
        // Get current user and fetch subscriptions
        const initialize = async () => {
            if (!supabase) return;

            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserEmail(user.email || null);
            }

            await fetchSubscriptions();
        };

        initialize();
    }, [supabase, fetchSubscriptions]);

    // Calculate total from active subscriptions only
    const totalMonthlyWaste = subscriptions.reduce((sum, sub) => sum + sub.cost, 0);

    const handleScan = async () => {
        if (!emailText.trim()) {
            setError('Please paste an email to scan');
            return;
        }

        setIsScanning(true);
        setError(null);
        setScanResult(null);

        try {
            const response = await fetch('/api/parse-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emailText }),
            });

            const data = await response.json();

            if (data.success && data.data) {
                setScanResult(data.data);

                // Get current user for user_id
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    setError('Please log in to save subscriptions');
                    return;
                }

                // Insert into Supabase
                const { error: insertError } = await supabase
                    .from('subscriptions')
                    .insert({
                        user_id: user.id,
                        service_name: data.data.service_name,
                        cost: data.data.cost,
                        currency: 'USD',
                        renewal_date: data.data.renewal_date,
                        status: 'active',
                    });

                if (insertError) {
                    console.error('Insert error:', insertError);
                    setError('Failed to save subscription');
                } else {
                    setEmailText('');
                    showToast(`Added ${data.data.service_name} to your subscriptions!`, 'success');
                    // Refresh the list from database
                    await fetchSubscriptions();
                }
            } else {
                setError(data.error || 'Failed to parse email');
            }
        } catch {
            setError('Failed to connect to parser. Make sure OPENAI_API_KEY is set.');
        } finally {
            setIsScanning(false);
        }
    };

    const handleCancelSubscription = async (id: string) => {
        // Refresh subscriptions from database after cancellation
        await fetchSubscriptions();
    };

    const handleLogout = async () => {
        if (!supabase) return;
        setIsLoggingOut(true);
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    const scrollToScan = () => {
        textareaRef.current?.scrollIntoView({ behavior: 'smooth' });
        textareaRef.current?.focus();
    };

    // Show loading state
    if (isLoading) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="spinner mx-auto mb-4" style={{ width: '48px', height: '48px' }}></div>
                    <p className="text-matrix-darkgreen">Loading your subscriptions...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen p-4 md:p-6 lg:p-12">
            {/* Header - Responsive */}
            <header className="flex flex-col md:flex-row items-center justify-between mb-8 md:mb-12 fade-in gap-4">
                <div className="text-center md:text-left">
                    <h1 className="text-3xl md:text-4xl lg:text-6xl font-bold glow-text tracking-wider">
                        SUB<span className="text-red-500">SLAYER</span>
                    </h1>
                    <p className="text-matrix-darkgreen text-sm md:text-lg hidden sm:block">
                        Track. Identify. <span className="text-red-500">Eliminate.</span>
                    </p>
                </div>

                {/* User Info & Logout */}
                <div className="flex items-center gap-3">
                    {userEmail && (
                        <span className="text-matrix-darkgreen text-xs md:text-sm truncate max-w-[150px] md:max-w-none">
                            {userEmail}
                        </span>
                    )}
                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium uppercase tracking-wider
                                   bg-red-900/30 text-red-400 hover:bg-red-900/60 hover:text-red-300 
                                   transition-all duration-200 active:scale-95 disabled:opacity-50"
                    >
                        {isLoggingOut ? 'Logging out...' : 'Logout'}
                    </button>
                </div>
            </header>

            {/* Hero Section - Total Monthly Waste (only show if has subscriptions) */}
            {subscriptions.length > 0 && (
                <section className="mb-8 md:mb-12 fade-in" style={{ animationDelay: '0.1s' }}>
                    <div className="matrix-card card-glow text-center max-w-2xl mx-auto p-6 md:p-8">
                        <p className="text-matrix-darkgreen uppercase tracking-widest mb-2 text-xs md:text-sm">
                            Total Monthly Waste
                        </p>
                        <div className="text-5xl md:text-6xl lg:text-8xl font-bold glow-text mb-2">
                            ${totalMonthlyWaste.toFixed(2)}
                        </div>
                        <p className="text-matrix-darkgreen text-xs md:text-sm">
                            {subscriptions.length} active subscription{subscriptions.length !== 1 ? 's' : ''} detected
                        </p>

                        {/* Expiring soon warning */}
                        {subscriptions.filter(s => getDaysUntilRenewal(s.renewal_date) <= 3).length > 0 && (
                            <div className="mt-4 text-red-500 flex items-center justify-center gap-2 text-sm">
                                <span className="animate-pulse">⚠</span>
                                <span>
                                    {subscriptions.filter(s => getDaysUntilRenewal(s.renewal_date) <= 3).length} subscription(s) renewing soon!
                                </span>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Email Parser Section */}
            <section className="mb-8 md:mb-12 fade-in" style={{ animationDelay: '0.2s' }}>
                <div className="matrix-card max-w-4xl mx-auto">
                    <h2 className="text-lg md:text-xl font-bold glow-subtle mb-4 flex items-center gap-2">
                        <span className="text-xl md:text-2xl">🔍</span> Magic Parser
                    </h2>
                    <p className="text-matrix-darkgreen text-xs md:text-sm mb-4">
                        Paste your subscription confirmation or welcome email below. Our AI will extract the details automatically.
                    </p>

                    <textarea
                        ref={textareaRef}
                        className="input-matrix min-h-[150px] md:min-h-[200px] mb-4 text-sm md:text-base"
                        placeholder={`Paste your email here...

Example:
"Welcome to Netflix! Your subscription of $15.99/month will renew on January 15, 2025. 
Thank you for joining us!"`}
                        value={emailText}
                        onChange={(e) => setEmailText(e.target.value)}
                        disabled={isScanning}
                    />

                    <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
                        <button
                            className="btn-matrix w-full sm:w-auto min-h-[48px] flex items-center justify-center gap-2"
                            onClick={handleScan}
                            disabled={isScanning}
                        >
                            {isScanning ? (
                                <>
                                    <div className="spinner"></div>
                                    <span>Scanning...</span>
                                </>
                            ) : (
                                <>
                                    <span>⚡</span>
                                    <span>Scan Email</span>
                                </>
                            )}
                        </button>

                        <div className="text-center sm:text-right">
                            {error && (
                                <p className="text-red-500 text-sm">{error}</p>
                            )}

                            {scanResult && (
                                <p className="text-green-400 text-sm">
                                    ✓ Found: {scanResult.service_name} - ${scanResult.cost}/mo
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Subscriptions Section */}
            <section className="fade-in" style={{ animationDelay: '0.3s' }}>
                <h2 className="text-xl md:text-2xl font-bold glow-subtle mb-4 md:mb-6 text-center">
                    Your Subscriptions
                </h2>

                {subscriptions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-6xl mx-auto">
                        {subscriptions.map((subscription) => (
                            <SubscriptionCard
                                key={subscription.id}
                                subscription={subscription}
                                onCancel={handleCancelSubscription}
                            />
                        ))}
                    </div>
                ) : (
                    <EmptyState onScanClick={scrollToScan} />
                )}
            </section>

            {/* Footer */}
            <footer className="mt-12 md:mt-16 text-center text-matrix-darkgreen text-xs md:text-sm">
                <p>SubSlayer © 2024 • Slay your forgotten subscriptions</p>
            </footer>
        </main>
    );
}

// Wrap with ToastProvider
export default function Dashboard() {
    return (
        <ToastProvider>
            <DashboardContent />
        </ToastProvider>
    );
}
