export type FeedArticle = {
    id: string;
    title: string;
    coverUrl: string;
    tags: string[];
    authorName: string;
    publishedAt: string;
};

function asRecord(v: unknown): Record<string, unknown> {
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function pickFirstString(...vals: unknown[]): string {
    for (const v of vals) {
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
}

function normalizeTags(raw: unknown): string[] {
    // ["йога", "сон"] или [{name:"йога"}] или [{title:"йога"}]
    if (Array.isArray(raw)) {
        return raw
            .map((t) => {
                if (typeof t === "string") return t.trim();
                const obj = asRecord(t);
                return pickFirstString(obj.name, obj.title, obj.tag);
            })
            .filter(Boolean);
    }

    // "йога, сон"
    if (typeof raw === "string") {
        return raw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
    }

    return [];
}

export function normalizeArticle(raw: unknown): FeedArticle | null {
    const obj = asRecord(raw);

    const id = pickFirstString(obj.id, obj._id, obj.slug);
    const title = pickFirstString(obj.title, obj.name);

    // твой бэк отдаёт imageUrl
    const coverUrl = pickFirstString(
        obj.coverUrl,
        obj.cover_url,
        obj.imageUrl,
        obj.image_url,
        obj.image,
        obj.cover,
        obj.photoUrl,
        obj.photo_url
    );

    // твой бэк отдаёт authorName (строка)
    const authorName =
        pickFirstString(obj.authorName, obj.author_name) || "Неизвестный автор";

    // твой бэк отдаёт createdAt
    const publishedAt = pickFirstString(
        obj.publishedAt,
        obj.published_at,
        obj.createdAt,
        obj.created_at,
        obj.date
    );

    // ✅ ВАЖНО: если tags нет — берём category как тег
    const tagsFromApi = normalizeTags(obj.tags ?? obj.tagList ?? obj.articleTags);
    const category = pickFirstString(obj.category);
    const tags =
        tagsFromApi.length > 0 ? tagsFromApi : category ? [category] : [];

    if (!id || !title) return null;

    return {
        id,
        title,
        coverUrl: coverUrl || "/articles/placeholder.jpg",
        tags,
        authorName,
        publishedAt: publishedAt || new Date().toISOString(),
    };
}
