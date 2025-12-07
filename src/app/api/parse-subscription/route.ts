import { NextResponse } from 'next/server';

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

        const prompt = `You are an expert at extracting subscription information from emails.

Analyze the following email text and extract:
1. service_name: The name of the subscription service (e.g., "Netflix", "Spotify Premium")
2. cost: The monthly cost as a number (e.g., 15.99). If it's yearly, divide by 12.
3. renewal_date: The next renewal/billing date in YYYY-MM-DD format.

Return ONLY a valid JSON object with these exact fields. No markdown, no explanation, just the JSON.

Example: {"service_name": "Netflix", "cost": 15.99, "renewal_date": "2025-01-15"}

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
                max_tokens: 200,
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

        console.log('Successfully parsed:', parsedData);

        return NextResponse.json({
            success: true,
            data: {
                service_name: parsedData.service_name,
                cost: parsedData.cost,
                renewal_date: parsedData.renewal_date,
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
