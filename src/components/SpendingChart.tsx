'use client';

import { Subscription } from '@/types';

interface SpendingChartProps {
    subscriptions: Subscription[];
}

// Categorize subscriptions automatically
function categorizeSubscription(serviceName: string): string {
    const name = serviceName.toLowerCase();

    // Entertainment
    if (['netflix', 'spotify', 'hulu', 'disney', 'hbo', 'max', 'youtube', 'twitch', 'apple music', 'amazon prime', 'peacock', 'paramount'].some(s => name.includes(s))) {
        return 'Entertainment';
    }

    // Tools & Productivity
    if (['adobe', 'figma', 'notion', 'slack', 'zoom', 'microsoft', 'office', 'dropbox', 'google', 'evernote', 'todoist', 'asana', 'trello', 'linear', 'canva'].some(s => name.includes(s))) {
        return 'Productivity';
    }

    // Development
    if (['github', 'gitlab', 'vercel', 'netlify', 'aws', 'azure', 'digitalocean', 'heroku', 'docker', 'jetbrains', 'openai', 'chatgpt', 'copilot', 'cursor'].some(s => name.includes(s))) {
        return 'Development';
    }

    // Gaming
    if (['xbox', 'playstation', 'nintendo', 'steam', 'ea play', 'ubisoft', 'game pass', 'humble'].some(s => name.includes(s))) {
        return 'Gaming';
    }

    // News & Education
    if (['medium', 'substack', 'nyt', 'times', 'journal', 'coursera', 'udemy', 'skillshare', 'masterclass', 'linkedin learning'].some(s => name.includes(s))) {
        return 'Learning';
    }

    return 'Other';
}

// Category colors matching Matrix theme
const CATEGORY_COLORS: Record<string, string> = {
    'Entertainment': '#ff4444',
    'Productivity': '#00ff41',
    'Development': '#00bfff',
    'Gaming': '#ff00ff',
    'Learning': '#ffff00',
    'Other': '#888888',
};

export default function SpendingChart({ subscriptions }: SpendingChartProps) {
    if (subscriptions.length === 0) return null;

    // Group by category
    const categoryTotals: Record<string, number> = {};

    subscriptions.forEach(sub => {
        const category = categorizeSubscription(sub.service_name);
        categoryTotals[category] = (categoryTotals[category] || 0) + Number(sub.cost);
    });

    const totalSpending = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
    const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

    return (
        <div className="matrix-card card-glow p-4 md:p-6">
            <h3 className="text-lg md:text-xl font-bold glow-subtle mb-4 flex items-center gap-2">
                <span>📊</span> Spending Matrix
            </h3>

            {/* Bar Chart */}
            <div className="space-y-3 mb-6">
                {sortedCategories.map(([category, amount]) => {
                    const percentage = (amount / totalSpending) * 100;
                    return (
                        <div key={category}>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="flex items-center gap-2">
                                    <span
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: CATEGORY_COLORS[category] }}
                                    />
                                    {category}
                                </span>
                                <span className="text-matrix-darkgreen">
                                    ${amount.toFixed(2)} ({percentage.toFixed(0)}%)
                                </span>
                            </div>
                            <div className="h-6 bg-black/50 rounded-full overflow-hidden border border-matrix-darkgreen/30">
                                <div
                                    className="h-full rounded-full transition-all duration-1000 ease-out"
                                    style={{
                                        width: `${percentage}%`,
                                        backgroundColor: CATEGORY_COLORS[category],
                                        boxShadow: `0 0 10px ${CATEGORY_COLORS[category]}80`
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legend / Summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                {sortedCategories.map(([category, amount]) => (
                    <div
                        key={category}
                        className="flex items-center gap-2 p-2 rounded bg-black/30 border border-matrix-darkgreen/20"
                    >
                        <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: CATEGORY_COLORS[category] }}
                        />
                        <span className="truncate">{category}</span>
                    </div>
                ))}
            </div>

            {/* Insight */}
            {sortedCategories.length > 0 && (
                <div className="mt-4 p-3 bg-red-900/20 rounded-lg border border-red-500/30 text-sm">
                    <span className="text-red-400">💡 Insight:</span>{' '}
                    <span className="text-matrix-darkgreen">
                        <strong className="text-red-400">{sortedCategories[0][0]}</strong> is your biggest spend at ${sortedCategories[0][1].toFixed(2)}/mo
                    </span>
                </div>
            )}
        </div>
    );
}
