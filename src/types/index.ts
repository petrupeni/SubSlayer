// TypeScript type definitions for SubSlayer

export interface Subscription {
    id: string;
    user_id: string;
    service_name: string;
    cost: number;
    currency: string;
    renewal_date: string; // ISO date string
    status: 'active' | 'cancelled' | 'expiring_soon';
    created_at: string;
    // Smart Cancel fields
    cancellation_url?: string;
    can_cancel_via_api?: boolean;
}

// Type for creating a new subscription (some fields are auto-generated)
export interface CreateSubscription {
    service_name: string;
    cost: number;
    currency?: string;
    renewal_date: string;
    status?: 'active' | 'cancelled' | 'expiring_soon';
}

// Type for the parsed data from OpenAI
export interface ParsedSubscription {
    service_name: string;
    cost: number;
    renewal_date: string;
}

// API response types
export interface ParseSubscriptionRequest {
    emailText: string;
}

export interface ParseSubscriptionResponse {
    success: boolean;
    data?: ParsedSubscription;
    error?: string;
}
