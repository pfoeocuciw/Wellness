const express = require("express");
const prisma = require("../prisma");

const router = express.Router();

// GET /api/articles  Ч список (можно с краткими пол€ми)
router.get("/", async (req, res) => {
  try {
    const articles = await prisma.article.findMany({
      where: { published: true },
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
    res.status(500).json({ error: "Failed to load articles" });
  }
});

// GET /api/articles/:slug Ч одна стать€ полностью
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const article = await prisma.article.findUnique({
      where: { slug }
    });

    if (!article) return res.status(404).json({ error: "Not found" });

    res.json(article);
  } catch (e) {
    res.status(500).json({ error: "Failed to load article" });
  }
});

module.exports = router;