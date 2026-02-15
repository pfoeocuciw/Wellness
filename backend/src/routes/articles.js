const express = require("express");
const prisma = require("../prisma");

const router = express.Router();

/**
 * GET /api/articles
 * Список статей (краткая информация)
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
 * Получение статьи по ID
 * ВАЖНО: должен быть выше, чем /:slug
 */
router.get("/id/:id", async (req, res) => {
    try {
        const article = await prisma.article.findUnique({
            where: { id: req.params.id }
        });

        if (!article) {
            return res.status(404).json({ error: "Article not found" });
        }

        res.json(article);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to load article by id" });
    }
});

/**
 * GET /api/articles/:slug
 * Получение статьи по slug
 */
router.get("/:slug", async (req, res) => {
    try {
        const { slug } = req.params;

        const article = await prisma.article.findUnique({
            where: { slug }
        });

        if (!article) {
            return res.status(404).json({ error: "Article not found" });
        }

        res.json(article);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to load article by slug" });
    }
});

module.exports = router;