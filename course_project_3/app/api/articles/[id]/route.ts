import { NextResponse } from "next/server";

function getBackendBase() {
    return (
        process.env.BACKEND_URL ||
        process.env.ARTICLES_API_URL ||
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        ""
    ).replace(/\/$/, "");
}

export async function GET(
    _: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const base = getBackendBase();
    if (!base) {
        return NextResponse.json(
            { error: "Backend URL is not configured" },
            { status: 500 }
        );
    }

    let res: Response;
    try {
        res = await fetch(`${base}/api/articles/id/${id}`, {
            cache: "no-store",
        });
    } catch {
        return NextResponse.json(
            { error: "Failed to reach backend service" },
            { status: 500 }
        );
    }

  if (!res.ok) {
    return NextResponse.json({ error: "Not found" }, { status: res.status });
  }

    const data = await res.json();
    return NextResponse.json(data);
}