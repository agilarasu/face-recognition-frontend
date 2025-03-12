// app/api/process-attendance/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const requestBody = await request.json();
        const azureFunctionUrl = process.env.AZURE_FUNCTION_URL;

        if (!azureFunctionUrl) {
            return NextResponse.json({ error: "AZURE_FUNCTION_URL environment variable not set in .env.local" }, { status: 500 });
        }

        const response = await fetch(azureFunctionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            console.error("Azure Function Error:", response.status, response.statusText);
            console.error("Azure Function Response:", response.body);
            return NextResponse.json({ error: "Error from Azure Function", details: { status: response.status, text: response.statusText } }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error("Proxy Error:", error);
        return NextResponse.json({ error: "Proxy error", details: error.message }, { status: 500 });
    }
}