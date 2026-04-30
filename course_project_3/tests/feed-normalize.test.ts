import { describe, expect, it } from "vitest";
import { normalizeArticle } from "../app/feed/normalize";

describe("normalizeArticle", () => {
    it("returns null for non-object values", () => {
        expect(normalizeArticle(null)).toBeNull();
        expect(normalizeArticle(undefined)).toBeNull();
        expect(normalizeArticle("text")).toBeNull();
        expect(normalizeArticle(123)).toBeNull();
    });

    it("returns null when id is missing", () => {
        expect(normalizeArticle({ title: "Article" })).toBeNull();
    });

    it("returns null when title is missing", () => {
        expect(normalizeArticle({ id: "1" })).toBeNull();
    });

    it("normalizes article with main fields", () => {
        const result = normalizeArticle({
            id: "1",
            title: "Test title",
            coverUrl: "/cover.jpg",
            tags: ["health", "sleep"],
            authorName: "Kate",
            publishedAt: "2026-01-01",
            coauthors: "Anna",
        });

        expect(result).toEqual({
            id: "1",
            title: "Test title",
            coverUrl: "/cover.jpg",
            tags: ["health", "sleep"],
            authorName: "Kate",
            publishedAt: "2026-01-01",
            coauthors: "Anna",
        });
    });

    it("uses _id when id is missing", () => {
        const result = normalizeArticle({
            _id: "mongo-id",
            title: "Article",
        });

        expect(result?.id).toBe("mongo-id");
    });

    it("uses slug when id and _id are missing", () => {
        const result = normalizeArticle({
            slug: "article-slug",
            title: "Article",
        });

        expect(result?.id).toBe("article-slug");
    });

    it("uses name when title is missing", () => {
        const result = normalizeArticle({
            id: "1",
            name: "Name as title",
        });

        expect(result?.title).toBe("Name as title");
    });

    it("trims id and title", () => {
        const result = normalizeArticle({
            id: "  1  ",
            title: "  Clean title  ",
        });

        expect(result?.id).toBe("1");
        expect(result?.title).toBe("Clean title");
    });

    it("uses default cover when cover is missing", () => {
        const result = normalizeArticle({
            id: "1",
            title: "Article",
        });

        expect(result?.coverUrl).toBe("/articles/yoga.svg");
    });

    it("supports cover_url", () => {
        const result = normalizeArticle({
            id: "1",
            title: "Article",
            cover_url: "/cover-url.jpg",
        });

        expect(result?.coverUrl).toBe("/cover-url.jpg");
    });

    it("supports imageUrl", () => {
        const result = normalizeArticle({
            id: "1",
            title: "Article",
            imageUrl: "/image-url.jpg",
        });

        expect(result?.coverUrl).toBe("/image-url.jpg");
    });

    it("supports image_url", () => {
        const result = normalizeArticle({
            id: "1",
            title: "Article",
            image_url: "/image-url.jpg",
        });

        expect(result?.coverUrl).toBe("/image-url.jpg");
    });

    it("supports image field", () => {
        const result = normalizeArticle({
            id: "1",
            title: "Article",
            image: "/image.jpg",
        });

        expect(result?.coverUrl).toBe("/image.jpg");
    });

    it("supports cover field", () => {
        const result = normalizeArticle({
            id: "1",
            title: "Article",
            cover: "/cover.jpg",
        });

        expect(result?.coverUrl).toBe("/cover.jpg");
    });

    it("supports photoUrl", () => {
        const result = normalizeArticle({
            id: "1",
            title: "Article",
            photoUrl: "/photo.jpg",
        });

        expect(result?.coverUrl).toBe("/photo.jpg");
    });

    it("supports photo_url", () => {
        const result = normalizeArticle({
            id: "1",
            title: "Article",
            photo_url: "/photo-url.jpg",
        });

        expect(result?.coverUrl).toBe("/photo-url.jpg");
    });

    it("uses default author when author is missing", () => {
        const result = normalizeArticle({
            id: "1",
            title: "Article",
        });

        expect(result?.authorName).toBe("Неизвестный автор");
    });

    it("supports author_name", () => {
        const result = normalizeArticle({
            id: "1",
            title: "Article",
            author_name: "Ivan",
        });

        expect(result?.authorName).toBe("Ivan");
    });

    it("supports createdAt as publishedAt", () => {
        const result = normalizeArticle({
            id: "1",
            title: "Article",
            createdAt: "2026-02-01",
        });

        expect(result?.publishedAt).toBe("2026-02-01");
    });

    it("supports created_at as publishedAt", () => {
        const result = normalizeArticle({
            id: "1",
            title: "Article",
            created_at: "2026-03-01",
        });

        expect(result?.publishedAt).toBe("2026-03-01");
    });

    it("supports published_at as publishedAt", () => {
        const result = normalizeArticle({
            id: "1",
            title: "Article",
            published_at: "2026-04-01",
        });

        expect(result?.publishedAt).toBe("2026-04-01");
    });

    it("supports date as publishedAt", () => {
        const result = normalizeArticle({
            id: "1",
            title: "Article",
            date: "2026-05-01",
        });

        expect(result?.publishedAt).toBe("2026-05-01");
    });

    it("creates current date when publishedAt is missing", () => {
        const result = normalizeArticle({
            id: "1",
            title: "Article",
        });

        expect(result?.publishedAt).toEqual(expect.any(String));
    });

    it("normalizes string tags array", () => {
        const result = normalizeArticle({
            id: "1",
            title: "Article",
            tags: ["  sleep  ", "sport", ""],
        });

        expect(result?.tags).toEqual(["sleep", "sport"]);
    });

    it("normalizes object tags array", () => {
        const result = normalizeArticle({
            id: "1",
            title: "Article",
            tags: [
                { name: "sleep" },
                { title: "sport" },
                { tag: "food" },
                {},
                null,
            ],
        });

        expect(result?.tags).toEqual(["sleep", "sport", "food"]);
    });

    it("normalizes comma separated tags", () => {
        const result = normalizeArticle({
            id: "1",
            title: "Article",
            tags: "sleep, sport, food",
        });

        expect(result?.tags).toEqual(["sleep", "sport", "food"]);
    });

    it("uses tagList when tags are missing", () => {
        const result = normalizeArticle({
            id: "1",
            title: "Article",
            tagList: ["one", "two"],
        });

        expect(result?.tags).toEqual(["one", "two"]);
    });

    it("uses articleTags when tags and tagList are missing", () => {
        const result = normalizeArticle({
            id: "1",
            title: "Article",
            articleTags: [{ name: "wellness" }],
        });

        expect(result?.tags).toEqual(["wellness"]);
    });

    it("uses category as tag when tags are empty", () => {
        const result = normalizeArticle({
            id: "1",
            title: "Article",
            category: "Сон",
        });

        expect(result?.tags).toEqual(["Сон"]);
    });

    it("keeps empty tags when no tags and category", () => {
        const result = normalizeArticle({
            id: "1",
            title: "Article",
        });

        expect(result?.tags).toEqual([]);
    });

    it("ignores non-string coauthors", () => {
        const result = normalizeArticle({
            id: "1",
            title: "Article",
            coauthors: ["Anna"],
        });

        expect(result?.coauthors).toBe("");
    });

    it("keeps string coauthors", () => {
        const result = normalizeArticle({
            id: "1",
            title: "Article",
            coauthors: "Anna, Ivan",
        });

        expect(result?.coauthors).toBe("Anna, Ivan");
    });
});