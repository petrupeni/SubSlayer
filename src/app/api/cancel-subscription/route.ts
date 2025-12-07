import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
    try {
        const { subscriptionId } = await request.json();

        if (!subscriptionId) {
            return NextResponse.json(
                { success: false, error: 'Subscription ID is required' },
                { status: 400 }
            );
        }

        // Create Supabase client with server-side auth
        const supabase = await createClient();

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Update the subscription status to 'cancelled' in database
        const { error: updateError } = await supabase
            .from('subscriptions')
            .update({ status: 'cancelled' })
            .eq('id', subscriptionId)
            .eq('user_id', user.id); // Ensure user can only cancel their own

        if (updateError) {
            console.error('Database error:', updateError);
            return NextResponse.json(
                { success: false, error: 'Failed to cancel subscription' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Subscription cancelled successfully',
            subscriptionId,
        });
    } catch (error) {
        console.error('Cancel subscription error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to process cancellation request' },
            { status: 500 }
        );
    }
}
