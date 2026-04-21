import { describe, expect, it } from "vitest";
import { normalizeArticle } from "../app/feed/normalize";

describe("normalizeArticle", () => {
    it("returns null when required fields are missing", () => {
        expect(normalizeArticle({})).toBeNull();
        expect(normalizeArticle({ id: "a1" })).toBeNull();
    });

    it("normalizes basic article from backend fields", () => {
        const result = normalizeArticle({
            id: "a1",
            title: "Тест",
            imageUrl: "/img.jpg",
            category: "Сон",
            authorName: "Иван",
            createdAt: "2026-01-01T00:00:00.000Z",
        });

        expect(result).toEqual({
            id: "a1",
            title: "Тест",
            coverUrl: "/img.jpg",
            tags: ["Сон"],
            authorName: "Иван",
            publishedAt: "2026-01-01T00:00:00.000Z",
            coauthors: "",
        });
    });

    it("uses defaults when optional fields are absent", () => {
        const result = normalizeArticle({
            id: "a2",
            title: "Без автора",
        });

        expect(result?.authorName).toBe("Неизвестный автор");
        expect(result?.coverUrl).toBe("/articles/yoga.svg");
        expect(result?.tags).toEqual([]);
    });

    it("supports tag arrays of objects", () => {
        const result = normalizeArticle({
            id: "a3",
            title: "Теги",
            tags: [{ name: "йога" }, { title: "сон" }, { tag: "стресс" }],
        });

        expect(result?.tags).toEqual(["йога", "сон", "стресс"]);
    });

    it("supports comma separated tags", () => {
        const result = normalizeArticle({
            id: "a4",
            title: "Теги 2",
            tags: "питание, спорт, сон",
        });

        expect(result?.tags).toEqual(["питание", "спорт", "сон"]);
    });
});
