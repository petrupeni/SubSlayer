'use client';

import { useState } from 'react';
import { Subscription } from '@/types';
import { useToast } from './Toast';

interface SubscriptionCardProps {
    subscription: Subscription;
    onCancel: (id: string) => void;
}

function getDaysUntilRenewal(renewalDate: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const renewal = new Date(renewalDate);
    renewal.setHours(0, 0, 0, 0);
    const diffTime = renewal.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getCardClass(daysUntil: number): string {
    if (daysUntil <= 3) return 'card-danger';
    if (daysUntil > 10) return 'card-safe';
    return 'card-warning';
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

// Common cancellation URLs for popular services
const KNOWN_CANCELLATION_URLS: Record<string, string> = {
    'netflix': 'https://www.netflix.com/cancelplan',
    'spotify': 'https://www.spotify.com/account/subscription/',
    'spotify premium': 'https://www.spotify.com/account/subscription/',
    'adobe': 'https://account.adobe.com/plans',
    'adobe creative cloud': 'https://account.adobe.com/plans',
    'github': 'https://github.com/settings/billing',
    'github pro': 'https://github.com/settings/billing',
    'chatgpt': 'https://chat.openai.com/settings/subscription',
    'chatgpt plus': 'https://chat.openai.com/settings/subscription',
    'openai': 'https://platform.openai.com/account/billing',
    'figma': 'https://www.figma.com/settings',
    'youtube': 'https://www.youtube.com/paid_memberships',
    'youtube premium': 'https://www.youtube.com/paid_memberships',
    'amazon prime': 'https://www.amazon.com/gp/primecentral',
    'apple music': 'https://support.apple.com/en-us/HT202039',
    'disney+': 'https://www.disneyplus.com/account',
    'hulu': 'https://secure.hulu.com/account',
    'hbo max': 'https://www.max.com/account',
    'max': 'https://www.max.com/account',
};

function getCancellationUrl(subscription: Subscription): string | null {
    // First check if subscription has a direct URL
    if (subscription.cancellation_url) {
        return subscription.cancellation_url;
    }

    // Try to find a known URL
    const serviceName = subscription.service_name.toLowerCase();
    for (const [key, url] of Object.entries(KNOWN_CANCELLATION_URLS)) {
        if (serviceName.includes(key) || key.includes(serviceName)) {
            return url;
        }
    }

    // Try Google search as fallback
    return `https://www.google.com/search?q=cancel+${encodeURIComponent(subscription.service_name)}+subscription`;
}

export default function SubscriptionCard({ subscription, onCancel }: SubscriptionCardProps) {
    const [isCancelling, setIsCancelling] = useState(false);
    const { showToast } = useToast();

    const daysUntil = getDaysUntilRenewal(subscription.renewal_date);
    const cardClass = getCardClass(daysUntil);

    const handleCancel = async () => {
        const cancellationUrl = getCancellationUrl(subscription);

        // Always open the cancellation URL first
        if (cancellationUrl) {
            window.open(cancellationUrl, '_blank', 'noopener,noreferrer');
            showToast(`Opening ${subscription.service_name} cancellation page...`, 'info');
        }

        // Then mark as cancelled in the database
        setIsCancelling(true);
        try {
            const response = await fetch('/api/cancel-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscriptionId: subscription.id }),
            });

            const data = await response.json();

            if (data.success) {
                showToast(`${subscription.service_name} marked as cancelled!`, 'success');
                onCancel(subscription.id);
            } else {
                showToast(data.error || 'Failed to update subscription status', 'error');
            }
        } catch {
            showToast('Network error. Please try again.', 'error');
        } finally {
            setIsCancelling(false);
        }
    };

    return (
        <div className={`matrix-card ${cardClass} transition-all duration-300`}>
            {/* Service Name */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg md:text-xl font-bold truncate flex-1 mr-2">
                    {subscription.service_name}
                </h3>
                {daysUntil <= 3 && (
                    <span className="text-red-500 text-2xl animate-pulse flex-shrink-0">⚠</span>
                )}
            </div>

            {/* Cost */}
            <div className="mb-4">
                <p className="text-matrix-darkgreen text-xs uppercase tracking-wider">
                    Monthly Cost
                </p>
                <p className="text-2xl md:text-3xl font-bold glow-subtle">
                    ${Number(subscription.cost).toFixed(2)}
                    <span className="text-sm text-matrix-darkgreen ml-1">
                        {subscription.currency}
                    </span>
                </p>
            </div>

            {/* Renewal Date */}
            <div className="mb-4">
                <p className="text-matrix-darkgreen text-xs uppercase tracking-wider">
                    Next Renewal
                </p>
                <p className="text-base md:text-lg">
                    {formatDate(subscription.renewal_date)}
                </p>
                <p className={`text-sm ${daysUntil <= 3 ? 'text-red-500' :
                        daysUntil > 10 ? 'text-green-400' : 'text-yellow-400'
                    }`}>
                    {daysUntil === 0 ? 'Renews today!' :
                        daysUntil === 1 ? 'Renews tomorrow' :
                            daysUntil < 0 ? 'Renewal overdue' :
                                `${daysUntil} days remaining`}
                </p>
            </div>

            {/* Status Badge & Cancel Button */}
            <div className="flex items-center justify-between gap-2">
                <span className={`
                    text-xs uppercase tracking-wider px-3 py-1 rounded-full flex-shrink-0
                    ${subscription.status === 'active' ? 'bg-green-900/50 text-green-400' :
                        subscription.status === 'expiring_soon' ? 'bg-red-900/50 text-red-400' :
                            'bg-gray-900/50 text-gray-400'}
                `}>
                    {subscription.status.replace('_', ' ')}
                </span>

                <button
                    onClick={handleCancel}
                    disabled={isCancelling}
                    className={`
                        min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium uppercase tracking-wider
                        transition-all duration-200 flex items-center gap-2
                        ${isCancelling
                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                            : 'bg-red-900/30 text-red-400 hover:bg-red-900/60 hover:text-red-300 active:scale-95'}
                    `}
                >
                    {isCancelling ? (
                        <>
                            <div className="w-4 h-4 border-2 border-gray-500 border-t-red-400 rounded-full animate-spin"></div>
                            <span>Cancelling...</span>
                        </>
                    ) : (
                        <>
                            <span>↗</span>
                            <span>Cancel</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
