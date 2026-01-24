import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    const body = await req.json();

    const backendResponse = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!backendResponse.ok) {
        return NextResponse.json(
            { error: 'Backend error' },
            { status: backendResponse.status }
        );
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);
}
