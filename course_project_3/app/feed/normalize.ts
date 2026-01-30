export type FeedArticle = {
    id: string;
    title: string;
    coverUrl: string;
    tags: string[];
    authorName: string;
    publishedAt: string;
};

function asString(v: unknown): string {
    return typeof v === "string" ? v : "";
}

function pickFirstString(...vals: unknown[]): string {
    for (const v of vals) {
        const s = asString(v);
        if (s) return s;
    }
    return "";
}

function normalizeTags(raw: unknown): string[] {
    // варианты: ["йога", "сон"] или [{name:"йога"}] или [{title:"йога"}]
    if (Array.isArray(raw)) {
        return raw
            .map((t) => {
                if (typeof t === "string") return t;
                if (t && typeof t === "object") {
                    const obj = t as Record<string, unknown>;
                    return pickFirstString(obj.name, obj.title, obj.tag);
                }
                return "";
            })
            .filter(Boolean);
    }
    // варианты: "йога,сон"
    if (typeof raw === "string") {
        return raw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
    }
    return [];
}

export function normalizeArticle(raw: unknown): FeedArticle {
    const obj = (raw ?? {}) as Record<string, unknown>;

    // автор может приходить как строка или объект
    const author = obj.author as unknown;
    const authorName =
        typeof author === "string"
            ? author
            : (author && typeof author === "object"
            ? pickFirstString(
                (author as Record<string, unknown>).name,
                (author as Record<string, unknown>).fullName
            )
            : "") || "Неизвестный автор";

    const tags = normalizeTags(obj.tags ?? obj.tagList ?? obj.articleTags);

    return {
        id: pickFirstString(obj.id, obj._id, obj.slug),
        title: pickFirstString(obj.title, obj.name),
        coverUrl: pickFirstString(obj.coverUrl, obj.cover_url, obj.image, obj.cover, obj.photoUrl, obj.photo_url),
        tags,
        authorName,
        publishedAt: pickFirstString(obj.publishedAt, obj.published_at, obj.date, obj.createdAt),
    };
}
