import { NextResponse } from "next/server";

export async function GET(
    _: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const base =
        process.env.BACKEND_URL ||
        process.env.ARTICLES_API_URL ||
        "https://wellness-production-b0b2.up.railway.app";

    const res = await fetch(`${base}/api/articles/id/${id}`, {
        cache: "no-store",
    });

  if (!res.ok) {
    return NextResponse.json({ error: "Not found" }, { status: res.status });
  }

    const data = await res.json();
    return NextResponse.json(data);
}