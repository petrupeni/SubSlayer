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

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error('GEMINI_API_KEY is not set');
            return NextResponse.json(
                { success: false, error: 'GEMINI_API_KEY is not configured' },
                { status: 500 }
            );
        }

        console.log('Calling Gemini API with email length:', emailText.length);

        const prompt = `You are an expert at extracting subscription information from emails.

Analyze the following email text and extract:
1. service_name: The name of the subscription service (e.g., "Netflix", "Spotify Premium")
2. cost: The monthly cost as a number (e.g., 15.99). If it's yearly, divide by 12.
3. renewal_date: The next renewal/billing date in YYYY-MM-DD format. If no specific date, estimate based on context.

IMPORTANT: Return ONLY a valid JSON object with these exact fields. No markdown, no explanation, just the JSON.

Example response:
{"service_name": "Netflix", "cost": 15.99, "renewal_date": "2025-01-15"}

Email text to analyze:
${emailText}`;

        // Use REST API directly with gemini-1.5-flash
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                }),
            }
        );

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Gemini API error:', response.status, errorData);
            return NextResponse.json(
                { success: false, error: `Gemini API error: ${response.status}` },
                { status: 500 }
            );
        }

        const data = await response.json();
        console.log('Gemini response:', JSON.stringify(data, null, 2));

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (!text) {
            console.error('No text in Gemini response');
            return NextResponse.json(
                { success: false, error: 'No response from AI' },
                { status: 500 }
            );
        }

        console.log('Gemini raw response:', text);

        // Clean the response - remove markdown code blocks if present
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

        console.log('Cleaned response:', cleanedText);

        const parsedData = JSON.parse(cleanedText);

        // Validate the parsed data
        if (!parsedData.service_name || typeof parsedData.cost !== 'number' || !parsedData.renewal_date) {
            console.error('Invalid parsed data:', parsedData);
            return NextResponse.json(
                { success: false, error: 'Could not extract all required fields from email' },
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
        console.error('Parse subscription error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to parse email. Please try again.' },
            { status: 500 }
        );
    }
}
