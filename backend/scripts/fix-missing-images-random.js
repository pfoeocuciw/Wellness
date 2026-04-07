const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const FRONT_IMAGES_DIR = path.resolve(__dirname, "../../course_project_3/public/images/articles");

function getImageFiles(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((name) => {
        const ext = path.extname(name).toLowerCase();
        return [".jpg", ".jpeg", ".png", ".webp"].includes(ext);
    });
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
    const files = getImageFiles(FRONT_IMAGES_DIR);

    if (!files.length) {
        throw new Error("В папке public/images/articles нет картинок");
    }

    const articles = await prisma.article.findMany({
        select: {
            id: true,
            title: true,
            slug: true,
            imageUrl: true,
        },
    });

    let updated = 0;

    for (const article of articles) {
        const currentFilename = decodeURIComponent(article.imageUrl || "").split("/").pop() || "";
        const exists = currentFilename && files.includes(currentFilename);

        if (exists) continue;

        const randomFile = pickRandom(files);
        const newUrl = `/images/articles/${encodeURIComponent(randomFile)}`;

        await prisma.article.update({
            where: { id: article.id },
            data: { imageUrl: newUrl },
        });

        updated += 1;
        console.log(`UPDATED: ${article.title}`);
        console.log(`  old: ${article.imageUrl}`);
        console.log(`  new: ${newUrl}`);
    }

    console.log(`\nГотово. Обновлено статей: ${updated}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });