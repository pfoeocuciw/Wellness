import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const incomingForm = await req.formData();
        const upstreamForm = new FormData();

        for (const [key, value] of incomingForm.entries()) {
            upstreamForm.append(key, value);
        }

        const primaryBase =
            process.env.EXPERT_API_URL ||
            process.env.CHAT_API_URL ||
            process.env.NEXT_PUBLIC_EXPERT_API_URL ||
            process.env.NEXT_PUBLIC_CHAT_API_URL ||
            "https://zealous-integrity-production-4287.up.railway.app";

        let upstream = await fetch(`${primaryBase}/expert/verify`, {
            method: "POST",
            body: upstreamForm,
            cache: "no-store",
        });

        // На некоторых деплоях chat-сервис содержит только /chat и /generate-title.
        // В этом случае пробуем локальный AI контейнер.
        if (upstream.status === 404 && primaryBase !== "http://localhost:8000") {
            const fallbackForm = new FormData();
            for (const [key, value] of incomingForm.entries()) {
                fallbackForm.append(key, value);
            }

            upstream = await fetch("http://localhost:8000/expert/verify", {
                method: "POST",
                body: fallbackForm,
                cache: "no-store",
            });
        }

        const text = await upstream.text();

        return new NextResponse(text, {
            status: upstream.status,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        return NextResponse.json(
            {
                error: "expert verify proxy crashed",
                details: error instanceof Error ? error.message : "unknown",
            },
            { status: 502 }
        );
    }
}
