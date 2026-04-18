const service = require("../src/services/saved-articles.service");

describe("saved-articles.service", () => {
    it("maps saved records to article list", () => {
        const result = service.mapSavedArticles([
            { article: { id: "a1" } },
            { article: null },
            { article: { id: "a2" } },
        ]);

        expect(result).toEqual([{ id: "a1" }, { id: "a2" }]);
    });

    it("returns only article ids", async () => {
        const prisma = {
            savedArticle: {
                findMany: vi.fn().mockResolvedValue([{ articleId: "x" }, { articleId: "y" }]),
            },
        };

        const ids = await service.getSavedArticleIds(prisma, 7);
        expect(ids).toEqual(["x", "y"]);
        expect(prisma.savedArticle.findMany).toHaveBeenCalledWith({
            where: { userId: 7 },
            select: { articleId: true },
        });
    });

    it("adds saved article via upsert", async () => {
        const prisma = {
            article: {
                findFirst: vi.fn().mockResolvedValue({ id: "a1" }),
            },
            savedArticle: {
                upsert: vi.fn().mockResolvedValue({}),
                deleteMany: vi.fn(),
            },
        };

        const result = await service.toggleSavedArticle(prisma, 1, "a1", true);

        expect(result).toEqual({ found: true, saved: true });
        expect(prisma.savedArticle.upsert).toHaveBeenCalled();
        expect(prisma.savedArticle.deleteMany).not.toHaveBeenCalled();
    });

    it("removes saved article via deleteMany", async () => {
        const prisma = {
            article: {
                findFirst: vi.fn().mockResolvedValue({ id: "a1" }),
            },
            savedArticle: {
                upsert: vi.fn(),
                deleteMany: vi.fn().mockResolvedValue({}),
            },
        };

        const result = await service.toggleSavedArticle(prisma, 1, "a1", false);

        expect(result).toEqual({ found: true, saved: false });
        expect(prisma.savedArticle.deleteMany).toHaveBeenCalledWith({
            where: { userId: 1, articleId: "a1" },
        });
    });

    it("returns not found when article is missing", async () => {
        const prisma = {
            article: {
                findFirst: vi.fn().mockResolvedValue(null),
            },
            savedArticle: {
                upsert: vi.fn(),
                deleteMany: vi.fn(),
            },
        };

        const result = await service.toggleSavedArticle(prisma, 1, "a1", true);
        expect(result).toEqual({ found: false, saved: false });
        expect(prisma.savedArticle.upsert).not.toHaveBeenCalled();
    });

    it("loads saved articles list", async () => {
        const prisma = {
            savedArticle: {
                findMany: vi.fn().mockResolvedValue([
                    { article: { id: "a1", title: "one" } },
                    { article: { id: "a2", title: "two" } },
                ]),
            },
        };

        const result = await service.getSavedArticles(prisma, 1);
        expect(result).toEqual([
            { id: "a1", title: "one" },
            { id: "a2", title: "two" },
        ]);
    });
});
