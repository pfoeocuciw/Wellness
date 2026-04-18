const express = require("express");
const prisma = require("../prisma");

const router = express.Router();
const DEFAULT_ARTICLE_IMAGE = "/images/articles/img_нарушения-сна-у-жителей-мегаполиса_65237053.png";

async function pickRandomArticleImageUrl() {
    const total = await prisma.article.count({
        where: {
            imageUrl: {
                not: "",
            },
        },
    });

    if (!total) return DEFAULT_ARTICLE_IMAGE;

    const randomOffset = Math.floor(Math.random() * total);
    const [randomArticle] = await prisma.article.findMany({
        where: {
            imageUrl: {
                not: "",
            },
        },
        select: { imageUrl: true },
        skip: randomOffset,
        take: 1,
    });

    return randomArticle?.imageUrl || DEFAULT_ARTICLE_IMAGE;
}

/**
 * GET /api/articles
 * Список статей (анонс)
 */
const authMiddleware = require("../middleware/auth");
const {
    getMyArticles,
    getMyArticleById,
    saveDraftArticle,
    updateDraftArticle,
    publishArticle,
    deleteMyArticle,
    uploadArticleCover,
    uploadArticleCoverFile,
    getSavedArticleIds,
    toggleSavedArticle,
    getSavedArticles,
} = require("../controllers/articles.controller");


router.post(
    "/cover",
    authMiddleware,
    uploadArticleCover.single("cover"),
    uploadArticleCoverFile
);
router.get("/my", authMiddleware, getMyArticles);
router.get("/my/:id", authMiddleware, getMyArticleById);
router.delete("/my/:id", authMiddleware, deleteMyArticle);
router.post("/draft", authMiddleware, saveDraftArticle);
router.patch("/draft/:id", authMiddleware, updateDraftArticle);
router.post("/publish", authMiddleware, publishArticle);
router.get("/saved", authMiddleware, getSavedArticles);
router.get("/saved/ids", authMiddleware, getSavedArticleIds);
router.post("/saved/toggle", authMiddleware, toggleSavedArticle);

router.get("/", async (req, res) => {
    try {
        const articles = await prisma.article.findMany({
            where: {
                status: "published",
                published: true,
            },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                title: true,
                slug: true,
                category: true,
                authorName: true,
                annotation: true,
                imageUrl: true,
                imageAlt: true,
                createdAt: true,
                coauthors: true,
            }
        });

        res.json(articles);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to load articles" });
    }
});

/**
 * GET /api/articles/id/:id
 */
router.get("/id/:id", async (req, res) => {
    try {
        const article = await prisma.article.findFirst({
            where: {
                id: req.params.id,
                status: "published",
                published: true,
            },
        });

        if (!article) return res.status(404).json({ error: "Article not found" });

        res.json(article);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to load article by id" });
    }
});

router.get("/:slug", async (req, res) => {
    try {
        const article = await prisma.article.findFirst({
            where: {
                slug: req.params.slug,
                status: "published",
                published: true,
            },
        });

        if (!article) return res.status(404).json({ error: "Article not found" });

        res.json(article);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to load article by slug" });
    }
});

/**
 * POST /api/articles
 * Создать новую статью (используйте аутентификацию/права на продакшне)
 * Тело: { title, authorName, authorBio?, category, annotation, imageUrl?, imageAlt?, content, sources, published? }
 */
router.post("/", async (req, res) => {
    try {
        const payload = req.body || {};
        const title = (payload.title || "").trim();
        if (!title) return res.status(400).json({ error: "Title is required" });

        // простая slugify
        const slugBase = String(title).toLowerCase()
            .replace(/ё/g, "е")
            .replace(/[^a-zа-я0-9]+/gi, "-")
            .replace(/^-+|-+$/g, "");

        // проверяем уникальность slug, добавляем суффикс при конфликте
        let slug = slugBase || `${Date.now()}`;
        let counter = 0;
        while (true) {
            const exists = await prisma.article.findUnique({ where: { slug } });
            if (!exists) break;
            counter += 1;
            slug = `${slugBase}-${counter}`;
            if (counter > 1000) break;
        }

        const articleData = {
            id: payload.id || undefined, // Prisma сгенерирует uuid если опустить
            title,
            slug,
            authorName: payload.authorName || "Автор",
            authorBio: payload.authorBio || null,
            category: payload.category || "Новости",
            annotation: payload.annotation || "",
            imageUrl: typeof payload.imageUrl === "string" && payload.imageUrl.trim()
                ? payload.imageUrl.trim()
                : await pickRandomArticleImageUrl(),
            imageAlt: payload.imageAlt || title,
            content: Array.isArray(payload.content) ? payload.content : [],
            sources: Array.isArray(payload.sources) ? payload.sources : [],
            published: typeof payload.published === "boolean" ? payload.published : true
        };

        const created = await prisma.article.create({ data: articleData });

        res.status(201).json(created);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to create article" });
    }
});


module.exports = router;