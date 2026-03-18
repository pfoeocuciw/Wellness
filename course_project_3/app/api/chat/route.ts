import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const base =
            process.env.CHAT_API_URL ||
            process.env.NEXT_PUBLIC_CHAT_API_URL ||
            "https://zealous-integrity-production-4287.up.railway.app";

        const upstream = await fetch(`${base}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        const text = await upstream.text();

        if (!upstream.ok) {
            return NextResponse.json(
                {
                    error: "Upstream chat error",
                    status: upstream.status,
                    body: text,
                },
                { status: 502 }
            );
        }

        try {
            const data = JSON.parse(text);
            return NextResponse.json(data);
        } catch {
            return NextResponse.json(
                { error: "Invalid JSON from chat service", body: text },
                { status: 502 }
            );
        }
    } catch (error) {
        return NextResponse.json(
            {
                error: "Chat proxy crashed",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 502 }
        );
    }
}