import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const body = await req.json();

    const base =
        process.env.CHAT_API_URL ||
        process.env.NEXT_PUBLIC_CHAT_API_URL ||
        "https://zealous-integrity-production-4287.up.railway.app";

    const backendResponse = await fetch(`${base}/generate-title`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    const data = await backendResponse.json();
    return NextResponse.json(data, { status: backendResponse.status });
}