import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// This route is called by Vercel Cron
export async function GET(request: Request) {
    // Verify cron secret (optional but recommended)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // Allow local testing without secret
        if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const resendKey = process.env.RESEND_API_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find subscriptions renewing in the next 3 days
    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    const todayStr = today.toISOString().split('T')[0];
    const futureStr = threeDaysFromNow.toISOString().split('T')[0];

    console.log(`Checking renewals between ${todayStr} and ${futureStr}`);

    // Get all active subscriptions with upcoming renewals
    const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('*, user_id')
        .eq('status', 'active')
        .gte('renewal_date', todayStr)
        .lte('renewal_date', futureStr);

    if (error) {
        console.error('Error fetching subscriptions:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    console.log(`Found ${subscriptions?.length || 0} subscriptions renewing soon`);

    if (!subscriptions || subscriptions.length === 0) {
        return NextResponse.json({ message: 'No upcoming renewals', count: 0 });
    }

    // Group subscriptions by user
    const userSubscriptions: Record<string, typeof subscriptions> = {};
    for (const sub of subscriptions) {
        if (!userSubscriptions[sub.user_id]) {
            userSubscriptions[sub.user_id] = [];
        }
        userSubscriptions[sub.user_id].push(sub);
    }

    // Get user emails
    const userIds = Object.keys(userSubscriptions);
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
        console.log('Could not fetch users (may need service role key)');
    }

    // If we have Resend key, send emails
    let emailsSent = 0;
    if (resendKey && users?.users) {
        const resend = new Resend(resendKey);

        for (const userId of userIds) {
            const user = users.users.find(u => u.id === userId);
            if (!user?.email) continue;

            const userSubs = userSubscriptions[userId];
            const totalCost = userSubs.reduce((sum, s) => sum + Number(s.cost), 0);

            const subscriptionList = userSubs.map(s => {
                const days = Math.ceil((new Date(s.renewal_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                return `• ${s.service_name}: $${Number(s.cost).toFixed(2)} (renews in ${days} day${days === 1 ? '' : 's'})`;
            }).join('\n');

            try {
                await resend.emails.send({
                    from: 'SubSlayer <noreply@resend.dev>',
                    to: user.email,
                    subject: `⚠️ ${userSubs.length} subscription${userSubs.length > 1 ? 's' : ''} renewing soon - $${totalCost.toFixed(2)} total`,
                    html: `
                        <div style="font-family: monospace; background: #0a0a0a; color: #00ff41; padding: 20px; border-radius: 8px;">
                            <h1 style="color: #00ff41; margin: 0 0 20px 0;">🔥 SubSlayer Alert</h1>
                            <p style="color: #888;">The following subscriptions are renewing in the next 3 days:</p>
                            <pre style="background: #111; padding: 15px; border-radius: 4px; color: #00ff41;">
${subscriptionList}

Total: $${totalCost.toFixed(2)}
                            </pre>
                            <p style="color: #ff4444; margin-top: 20px;">
                                Want to cancel? <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://subslayer.vercel.app'}" style="color: #ff4444;">Open SubSlayer →</a>
                            </p>
                        </div>
                    `,
                });
                emailsSent++;
                console.log(`Email sent to ${user.email}`);
            } catch (emailError) {
                console.error(`Failed to send email to ${user.email}:`, emailError);
            }
        }
    }

    return NextResponse.json({
        message: 'Renewal check complete',
        subscriptionsFound: subscriptions.length,
        usersNotified: userIds.length,
        emailsSent,
    });
}
