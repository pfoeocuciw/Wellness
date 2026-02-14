const { PrismaClient } = require("@prisma/client");
const fs = require("fs");

const prisma = new PrismaClient();

function slugify(text) {
    return String(text || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-zа-я0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "");
}

function makeUniqueSlugs(articles) {
    const used = new Map(); // slug -> count

    return articles.map((a) => {
        const base = a.slug && a.slug.trim() ? a.slug.trim() : slugify(a.title);
        const count = used.get(base) || 0;
        used.set(base, count + 1);

        const uniqueSlug = count === 0 ? base : `${base}-${count + 1}`;

        return {
            ...a,
            slug: uniqueSlug,
            imageUrl: a.imageUrl || `/images/articles/${uniqueSlug}.jpg`,
            imageAlt: a.imageAlt || a.title || uniqueSlug,
        };
    });
}

async function main() {
    const articlesRaw = JSON.parse(fs.readFileSync("./articles.json", "utf-8"));

    // 1) делаем slug’и уникальными
    const articles = makeUniqueSlugs(articlesRaw);

    // 2) очищаем таблицу (если хочешь именно “перезаливку”)
    await prisma.article.deleteMany();

    // 3) заливаем
    for (const article of articles) {
        await prisma.article.create({ data: article });
    }

    console.log(`Залито статей: ${articles.length}`);
}

main()
    .catch((e) => console.error(e))
    .finally(() => prisma.$disconnect());
