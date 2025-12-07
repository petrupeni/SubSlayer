'use client';

interface EmptyStateProps {
    onScanClick?: () => void;
}

export default function EmptyState({ onScanClick }: EmptyStateProps) {
    return (
        <div className="matrix-card card-glow text-center py-16 px-8 max-w-lg mx-auto">
            {/* Icon */}
            <div className="text-7xl mb-6 animate-pulse">
                📭
            </div>

            {/* Heading */}
            <h3 className="text-2xl font-bold glow-subtle mb-3">
                No Subscriptions Found
            </h3>

            {/* Description */}
            <p className="text-matrix-darkgreen mb-6 leading-relaxed">
                Your subscription dashboard is empty. Start tracking your subscriptions
                by scanning an email confirmation or welcome message.
            </p>

            {/* CTA Button */}
            {onScanClick && (
                <button
                    onClick={onScanClick}
                    className="btn-matrix min-h-[48px] inline-flex items-center gap-2"
                >
                    <span>🔍</span>
                    <span>Scan Your First Email</span>
                </button>
            )}

            {/* Tip */}
            <p className="text-matrix-darkgreen text-xs mt-6 opacity-60">
                💡 Tip: Paste any subscription confirmation email and our AI will extract the details automatically
            </p>
        </div>
    );
}
