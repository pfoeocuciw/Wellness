import { NextResponse } from "next/server";

export async function GET() {
    const base = process.env.BACKEND_URL || process.env.ARTICLES_API_URL || "http://localhost:3001";

    const res = await fetch(`${base}/api/articles`, { cache: "no-store" });

    if (!res.ok) {
        return NextResponse.json({ error: "Failed to load articles" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
}
