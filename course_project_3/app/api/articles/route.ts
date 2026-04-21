import { NextResponse } from "next/server";

function getBackendBase() {
    return (
        process.env.BACKEND_URL ||
        process.env.ARTICLES_API_URL ||
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        ""
    ).replace(/\/$/, "");
}

export async function GET() {
    const base = getBackendBase();
    if (!base) {
        return NextResponse.json(
            { error: "Backend URL is not configured" },
            { status: 500 }
        );
    }

    let res: Response;
    try {
        res = await fetch(`${base}/api/articles`, { cache: "no-store" });
    } catch {
        return NextResponse.json(
            { error: "Failed to reach backend service" },
            { status: 500 }
        );
    }

    if (!res.ok) {
        return NextResponse.json({ error: "Failed to load articles" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
}

export async function POST(req: Request) {
    const base = getBackendBase();
    if (!base) {
        return NextResponse.json(
            { error: "Backend URL is not configured" },
            { status: 500 }
        );
    }
    const authHeader = req.headers.get("authorization");
    const body = await req.text();

    let res: Response;
    try {
        res = await fetch(`${base}/api/articles`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(authHeader ? { Authorization: authHeader } : {}),
            },
            body,
        });
    } catch {
        return NextResponse.json(
            { error: "Failed to reach backend service" },
            { status: 500 }
        );
    }

    const raw = await res.text();
    let data: unknown = {};

    try {
        data = raw ? JSON.parse(raw) : {};
    } catch {
        data = { error: raw || "Unexpected server response" };
    }

    return NextResponse.json(data, { status: res.status });
}
