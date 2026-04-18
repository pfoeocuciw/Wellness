const express = require("express");
const prisma = require("../prisma");

const router = express.Router();

/**
 * GET /api/articles
 * Список статей (анонс)
 */
router.get("/", async (req, res) => {
    try {
        const articles = await prisma.article.findMany({
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
                createdAt: true
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
        const article = await prisma.article.findUnique({
            where: { id: req.params.id }
        });

        if (!article) return res.status(404).json({ error: "Article not found" });

        res.json(article);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to load article by id" });
    }
});

/**
 * GET /api/articles/:slug
 */
router.get("/:slug", async (req, res) => {
    try {
        const { slug } = req.params;

        const article = await prisma.article.findUnique({
            where: { slug }
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
            imageUrl: payload.imageUrl || "/images/articles/placeholder.png",
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