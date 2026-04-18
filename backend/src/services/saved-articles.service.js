function mapSavedArticles(records) {
    return records
        .map((item) => item.article)
        .filter(Boolean);
}

async function getSavedArticleIds(prisma, userId) {
    const saved = await prisma.savedArticle.findMany({
        where: { userId },
        select: { articleId: true },
    });

    return saved.map((item) => item.articleId);
}

async function toggleSavedArticle(prisma, userId, articleId, saved) {
    const article = await prisma.article.findFirst({
        where: {
            id: articleId,
            status: "published",
            published: true,
        },
        select: { id: true },
    });

    if (!article) {
        return { found: false, saved: false };
    }

    if (saved) {
        await prisma.savedArticle.upsert({
            where: {
                userId_articleId: {
                    userId,
                    articleId,
                },
            },
            update: {},
            create: {
                userId,
                articleId,
            },
        });
    } else {
        await prisma.savedArticle.deleteMany({
            where: { userId, articleId },
        });
    }

    return { found: true, saved: Boolean(saved) };
}

async function getSavedArticles(prisma, userId) {
    const saved = await prisma.savedArticle.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
            article: {
                select: {
                    id: true,
                    title: true,
                    imageUrl: true,
                    category: true,
                    authorName: true,
                    createdAt: true,
                    slug: true,
                },
            },
        },
    });

    return mapSavedArticles(saved);
}

module.exports = {
    mapSavedArticles,
    getSavedArticleIds,
    toggleSavedArticle,
    getSavedArticles,
};
