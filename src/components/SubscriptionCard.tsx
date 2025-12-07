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

export default function SubscriptionCard({ subscription, onCancel }: SubscriptionCardProps) {
    const [isCancelling, setIsCancelling] = useState(false);
    const { showToast } = useToast();

    const daysUntil = getDaysUntilRenewal(subscription.renewal_date);
    const cardClass = getCardClass(daysUntil);

    const handleCancel = async () => {
        // Scenario A: Direct API cancel (updates database)
        if (subscription.can_cancel_via_api) {
            setIsCancelling(true);

            try {
                const response = await fetch('/api/cancel-subscription', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subscriptionId: subscription.id }),
                });

                const data = await response.json();

                if (data.success) {
                    showToast(`${subscription.service_name} has been cancelled!`, 'success');
                    onCancel(subscription.id); // Trigger parent to refresh
                } else {
                    showToast(data.error || 'Failed to cancel subscription', 'error');
                }
            } catch {
                showToast('Network error. Please try again.', 'error');
            } finally {
                setIsCancelling(false);
            }
        }
        // Scenario B: Redirect to cancellation URL, then mark as cancelled in DB
        else if (subscription.cancellation_url) {
            window.open(subscription.cancellation_url, '_blank', 'noopener,noreferrer');
            showToast(`Opening ${subscription.service_name} cancellation page...`, 'info');

            // Also mark as cancelled in our database
            setIsCancelling(true);
            try {
                const response = await fetch('/api/cancel-subscription', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subscriptionId: subscription.id }),
                });

                if (response.ok) {
                    onCancel(subscription.id);
                }
            } catch {
                // Silent fail - user can still cancel manually
            } finally {
                setIsCancelling(false);
            }
        }
        // No external method - just mark as cancelled in DB
        else {
            setIsCancelling(true);
            try {
                const response = await fetch('/api/cancel-subscription', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subscriptionId: subscription.id }),
                });

                const data = await response.json();

                if (data.success) {
                    showToast(`${subscription.service_name} marked as cancelled`, 'success');
                    onCancel(subscription.id);
                } else {
                    showToast(data.error || 'Failed to cancel subscription', 'error');
                }
            } catch {
                showToast('Network error. Please try again.', 'error');
            } finally {
                setIsCancelling(false);
            }
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
                            {subscription.can_cancel_via_api ? '⚡' : subscription.cancellation_url ? '↗' : '✕'}
                            <span>Cancel</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
