const prisma = require("../prisma");

const path = require("path");
const fs = require("fs");
const multer = require("multer");
const savedArticlesService = require("../services/saved-articles.service");


const articleCoversDir = path.join(process.cwd(), "public", "uploads", "article_covers");

if (!fs.existsSync(articleCoversDir)) {
    fs.mkdirSync(articleCoversDir, { recursive: true });
}

const articleCoverStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, articleCoversDir);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || "");
        const safeBase = path
            .basename(file.originalname || "cover", ext)
            .replace(/[^a-zA-Z0-9_-]/g, "-");

        cb(null, `${Date.now()}-${safeBase}${ext}`);
    },
});

const uploadArticleCover = multer({
    storage: articleCoverStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
});

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

async function resolveArticleImageUrl(value) {
    const normalized = typeof value === "string" ? value.trim() : "";
    if (normalized) return normalized;
    return pickRandomArticleImageUrl();
}

async function uploadArticleCoverFile(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Файл не загружен" });
        }

        const imageUrl = `/uploads/article_covers/${req.file.filename}`;

        return res.json({
            message: "Обложка загружена",
            imageUrl,
        });
    } catch (error) {
        console.error("uploadArticleCoverFile error:", error);
        return res.status(500).json({
            message: "Ошибка загрузки обложки",
            error: error.message,
        });
    }
}

function makeSlug(text = "") {
    return String(text)
        .toLowerCase()
        .trim()
        .replace(/[^a-zа-яё0-9\s-]/gi, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

async function ensureUniqueSlug(baseSlug) {
    const cleanBase = baseSlug || `article-${Date.now()}`;
    let slug = cleanBase;
    let counter = 1;

    while (true) {
        const exists = await prisma.article.findUnique({
            where: { slug },
            select: { id: true },
        });

        if (!exists) return slug;

        slug = `${cleanBase}-${counter}`;
        counter += 1;
    }
}

function parseJsonField(value, fallback = []) {
    if (!value) return fallback;

    if (Array.isArray(value)) return value;

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

async function getMyArticles(req, res) {
    try {
        const userId = req.user.userId;

        const articles = await prisma.article.findMany({
            where: {
                authorId: userId,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return res.json({
            articles: articles.map((article) => ({
                id: article.id,
                title: article.title,
                imageUrl: article.imageUrl,
                createdAt: article.createdAt,
                status: article.status,
                slug: article.slug,
                coauthors: article.coauthors || "",
                tags: Array.isArray(article.tagsJson) ? article.tagsJson : [],
                content: article.content || "",
            })),
        });
    } catch (error) {
        console.error("getMyArticles error:", error);
        return res.status(500).json({
            message: "Ошибка получения статей",
            error: error.message,
        });
    }
}

async function getMyArticleById(req, res) {
    try {
        const userId = req.user.userId;
        const { id } = req.params;

        const article = await prisma.article.findFirst({
            where: {
                id,
                authorId: userId,
            },
        });

        if (!article) {
            return res.status(404).json({ message: "Статья не найдена" });
        }

        return res.json({
            article: {
                ...article,
                tags: parseJsonField(article.tagsJson, []),
                sourcesList: parseJsonField(article.sources, []),
            },
        });
    } catch (error) {
        console.error("getMyArticleById error:", error);
        return res.status(500).json({
            message: "Ошибка загрузки статьи",
            error: error.message,
        });
    }
}

async function saveDraftArticle(req, res) {
    try {
        const userId = req.user.userId;
        const {
            title,
            annotation,
            content,
            imageUrl,
            imageAlt,
            coauthors,
            tags,
            sources,
            category,
        } = req.body;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                first_name: true,
                last_name: true,
                bio: true,
            },
        });

        if (!user) {
            return res.status(404).json({ message: "Пользователь не найден" });
        }

        const safeTitle = title?.trim() || "Без названия";
        const slug = await ensureUniqueSlug(makeSlug(safeTitle));

        const article = await prisma.article.create({
            data: {
                title: safeTitle,
                slug,
                authorName: `${user.first_name} ${user.last_name}`.trim() || "Автор",
                authorBio: user.bio || null,
                category: category || "статья",
                annotation: annotation || "",
                imageUrl: await resolveArticleImageUrl(imageUrl),
                imageAlt: imageAlt || safeTitle,
                content: content || "",
                sources: Array.isArray(sources) ? sources : [],
                published: false,
                status: "draft",
                authorId: userId,
                coauthors: coauthors || "",
                tagsJson: Array.isArray(tags) ? tags : [],
                publishedAt: null,
            },
        });

        return res.json({
            message: "Черновик сохранён",
            article,
        });
    } catch (error) {
        console.error("saveDraftArticle error:", error);
        return res.status(500).json({
            message: "Ошибка сохранения черновика",
            error: error.message,
        });
    }
}

async function updateDraftArticle(req, res) {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const {
            title,
            annotation,
            content,
            imageUrl,
            imageAlt,
            coauthors,
            tags,
            sources,
            category,
        } = req.body;

        const article = await prisma.article.findFirst({
            where: {
                id,
                authorId: userId,
                status: "draft",
            },
        });

        if (!article) {
            return res.status(404).json({ message: "Черновик не найден" });
        }

        let nextSlug = article.slug;
        if (title && title.trim() && title.trim() !== article.title) {
            nextSlug = await ensureUniqueSlug(makeSlug(title.trim()));
        }

        const nextImageUrl =
            imageUrl === undefined
                ? article.imageUrl
                : await resolveArticleImageUrl(imageUrl);

        const updated = await prisma.article.update({
            where: { id },
            data: {
                title: title?.trim() || article.title,
                slug: nextSlug,
                annotation: annotation ?? article.annotation,
                imageUrl: nextImageUrl,
                imageAlt: imageAlt ?? article.imageAlt,
                coauthors: coauthors ?? article.coauthors,
                tagsJson: Array.isArray(tags) ? tags : article.tagsJson,
                content: content ?? article.content,
                sources: Array.isArray(sources) ? sources : article.sources,
                category: category ?? article.category,
            },
        });

        return res.json({
            message: "Черновик обновлён",
            article: updated,
        });
    } catch (error) {
        console.error("updateDraftArticle error:", error);
        return res.status(500).json({
            message: "Ошибка обновления черновика",
            error: error.message,
        });
    }
}

async function publishArticle(req, res) {
    try {
        const userId = req.user.userId;
        const { id } = req.body;

        const article = await prisma.article.findFirst({
            where: {
                id,
                authorId: userId,
            },
        });

        if (!article) {
            return res.status(404).json({ message: "Статья не найдена" });
        }

        const updated = await prisma.article.update({
            where: { id },
            data: {
                status: "published",
                published: true,
                publishedAt: new Date(),
            },
        });

        return res.json({
            message: "Статья опубликована",
            article: updated,
        });
    } catch (error) {
        console.error("publishArticle error:", error);
        return res.status(500).json({
            message: "Ошибка публикации статьи",
            error: error.message,
        });
    }
}

async function deleteMyArticle(req, res) {
    try {
        const userId = req.user.userId;
        const { id } = req.params;

        const article = await prisma.article.findFirst({
            where: {
                id,
                authorId: userId,
            },
        });

        if (!article) {
            return res.status(404).json({ message: "Статья не найдена" });
        }

        await prisma.article.delete({
            where: { id },
        });

        return res.json({ message: "Статья удалена" });
    } catch (error) {
        console.error("deleteMyArticle error:", error);
        return res.status(500).json({
            message: "Ошибка удаления статьи",
            error: error.message,
        });
    }
}

async function getSavedArticleIds(req, res) {
    try {
        const userId = req.user.userId;
        const articleIds = await savedArticlesService.getSavedArticleIds(prisma, userId);

        return res.json({
            articleIds,
        });
    } catch (error) {
        console.error("getSavedArticleIds error:", error);
        return res.status(500).json({
            message: "Ошибка загрузки сохранённых статей",
            error: error.message,
        });
    }
}

async function toggleSavedArticle(req, res) {
    try {
        const userId = req.user.userId;
        const { articleId, saved } = req.body || {};

        if (!articleId || typeof articleId !== "string") {
            return res.status(400).json({ message: "articleId обязателен" });
        }

        const result = await savedArticlesService.toggleSavedArticle(
            prisma,
            userId,
            articleId,
            Boolean(saved)
        );

        if (!result.found) {
            return res.status(404).json({ message: "Статья не найдена" });
        }
        return res.json({ articleId, saved: result.saved });
    } catch (error) {
        console.error("toggleSavedArticle error:", error);
        return res.status(500).json({
            message: "Ошибка сохранения статьи",
            error: error.message,
        });
    }
}

async function getSavedArticles(req, res) {
    try {
        const userId = req.user.userId;
        const articles = await savedArticlesService.getSavedArticles(prisma, userId);

        return res.json({
            articles,
        });
    } catch (error) {
        console.error("getSavedArticles error:", error);
        return res.status(500).json({
            message: "Ошибка загрузки сохранённых статей",
            error: error.message,
        });
    }
}

module.exports = {
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
};