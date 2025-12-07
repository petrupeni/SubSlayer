import { NextResponse } from 'next/server';

// Helper to ensure we have a valid future date with year
function normalizeDate(dateStr: string): string {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    // Try to parse the date
    let date = new Date(dateStr);

    // If parsing failed or year seems wrong, try to fix it
    if (isNaN(date.getTime())) {
        // Try adding current year
        date = new Date(`${dateStr} ${currentYear}`);
    }

    // If year is missing or unreasonably old/far
    if (date.getFullYear() < currentYear || date.getFullYear() > currentYear + 5) {
        // Extract month and day, use current or next year
        const parts = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})/);
        if (parts) {
            const month = parseInt(parts[1]) - 1;
            const day = parseInt(parts[2]);
            date = new Date(currentYear, month, day);

            // If date is in the past, use next year
            if (date < new Date()) {
                date = new Date(currentYear + 1, month, day);
            }
        }
    }

    // If the parsed date is in the past, assume next year
    if (date < new Date()) {
        date.setFullYear(date.getFullYear() + 1);
    }

    // Return in YYYY-MM-DD format
    return date.toISOString().split('T')[0];
}

export async function POST(request: Request) {
    try {
        const { emailText } = await request.json();

        if (!emailText || typeof emailText !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Email text is required' },
                { status: 400 }
            );
        }

        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            console.error('GROQ_API_KEY is not set');
            return NextResponse.json(
                { success: false, error: 'GROQ_API_KEY is not configured' },
                { status: 500 }
            );
        }

        console.log('Calling Groq API with email length:', emailText.length);

        const currentYear = new Date().getFullYear();

        const prompt = `You are an expert at extracting subscription information from emails.

Analyze the following email text and extract:
1. service_name: The name of the subscription service (e.g., "Netflix", "Spotify Premium")
2. cost: The monthly cost as a number (e.g., 15.99). If it's yearly, divide by 12.
3. currency: The 3-letter currency code (e.g., "USD", "EUR", "GBP", "RON", "CAD", "AUD", "JPY"). Detect from symbols like $, €, £, lei, ¥ or text like "USD", "EUR", etc. Default to "USD" if unclear.
4. renewal_date: The next renewal/billing date in YYYY-MM-DD format. If only month and day are provided, assume year ${currentYear} or ${currentYear + 1} (whichever makes the date in the future).
5. cancellation_url: The cancellation/account settings URL for this service.
6. website_url: The main website URL for this service (e.g., "https://netflix.com" for Netflix).

Return ONLY a valid JSON object with these exact fields. No markdown, no explanation, just the JSON.

Example: {"service_name": "Netflix", "cost": 15.99, "currency": "USD", "renewal_date": "2025-01-15", "cancellation_url": "https://netflix.com/cancelplan", "website_url": "https://netflix.com"}

Email:
${emailText}`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                    { role: 'user', content: prompt }
                ],
                temperature: 0.1,
                max_tokens: 300,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Groq API error:', response.status, errorText);
            return NextResponse.json(
                { success: false, error: `AI API error: ${response.status}` },
                { status: 500 }
            );
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content?.trim();

        if (!text) {
            console.error('No response from Groq');
            return NextResponse.json(
                { success: false, error: 'No response from AI' },
                { status: 500 }
            );
        }

        console.log('Groq raw response:', text);

        // Clean markdown if present
        let cleanedText = text;
        if (cleanedText.startsWith('```json')) {
            cleanedText = cleanedText.slice(7);
        } else if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.slice(3);
        }
        if (cleanedText.endsWith('```')) {
            cleanedText = cleanedText.slice(0, -3);
        }
        cleanedText = cleanedText.trim();

        const parsedData = JSON.parse(cleanedText);

        if (!parsedData.service_name || typeof parsedData.cost !== 'number' || !parsedData.renewal_date) {
            return NextResponse.json(
                { success: false, error: 'Could not extract all fields from email' },
                { status: 422 }
            );
        }

        // Normalize the date to ensure it's valid and in the future
        const normalizedDate = normalizeDate(parsedData.renewal_date);

        console.log('Successfully parsed:', { ...parsedData, renewal_date: normalizedDate });

        return NextResponse.json({
            success: true,
            data: {
                service_name: parsedData.service_name,
                cost: parsedData.cost,
                currency: parsedData.currency || 'USD',
                renewal_date: normalizedDate,
                cancellation_url: parsedData.cancellation_url || null,
                website_url: parsedData.website_url || null,
            },
        });
    } catch (error) {
        console.error('Parse error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to parse email. Please try again.' },
            { status: 500 }
        );
    }
}
