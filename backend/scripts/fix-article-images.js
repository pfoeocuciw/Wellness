const fs = require("fs");
const path = require("path");
const PrismaClient = require("@prisma/client").PrismaClient;
const slugify = require("slugify");

const prisma = new PrismaClient();

// 1) Укажи путь к фронтовому public/images/articles
const FRONT_IMAGES_DIR = path.resolve(__dirname, "../../course_project_3/public/images/articles");

// 2) Если надо, можешь добавить и папку бэка
const BACK_IMAGES_DIR = path.resolve(__dirname, "../public/images/articles");

function fileExistsSafe(p) {
    try {
        return fs.existsSync(p);
    } catch {
        return false;
    }
}

function getAllFiles(dir) {
    if (!fileExistsSafe(dir)) return [];
    return fs
        .readdirSync(dir)
        .filter((name) => {
            const ext = path.extname(name).toLowerCase();
            return [".jpg", ".jpeg", ".png", ".webp"].includes(ext);
        });
}

function normalizeStoredUrlToFilename(imageUrl) {
    if (!imageUrl) return "";
    return decodeURIComponent(imageUrl).split("/").pop() || "";
}

function extractRussianBaseFromImgFilename(filename) {
    // img_текст_abcdef12.png -> текст
    const ext = path.extname(filename);
    const base = path.basename(filename, ext);

    if (!base.startsWith("img_")) return null;

    const noPrefix = base.slice(4);
    const lastUnderscore = noPrefix.lastIndexOf("_");
    if (lastUnderscore === -1) return noPrefix;

    return noPrefix.slice(0, lastUnderscore);
}

function buildCandidateMap(files) {
    const map = new Map();

    for (const filename of files) {
        const russianBase = extractRussianBaseFromImgFilename(filename);
        if (!russianBase) continue;

        const slug = slugify(russianBase, { lower: true, strict: true, locale: "ru" });
        if (!slug) continue;

        if (!map.has(slug)) {
            map.set(slug, []);
        }
        map.get(slug).push(filename);
    }

    return map;
}

async function main() {
    const frontFiles = getAllFiles(FRONT_IMAGES_DIR);
    const backFiles = getAllFiles(BACK_IMAGES_DIR);

    const allFiles = Array.from(new Set([...frontFiles, ...backFiles]));
    const existingSet = new Set(allFiles);
    const candidateMap = buildCandidateMap(allFiles);

    console.log(`Файлов во фронте: ${frontFiles.length}`);
    console.log(`Файлов в бэке: ${backFiles.length}`);
    console.log(`Уникальных файлов всего: ${allFiles.length}`);

    const articles = await prisma.article.findMany({
        select: {
            id: true,
            title: true,
            slug: true,
            imageUrl: true,
        },
        orderBy: { createdAt: "desc" },
    });

    let broken = 0;
    let fixed = 0;
    let unresolved = 0;

    for (const article of articles) {
        const currentFilename = normalizeStoredUrlToFilename(article.imageUrl);
        const currentExists = currentFilename && existingSet.has(currentFilename);

        if (currentExists) continue;

        broken += 1;

        let matchedFilename = null;

        // 1. Ищем точное имя вида slug.ext
        for (const ext of [".jpg", ".jpeg", ".png", ".webp"]) {
            const candidate = `${article.slug}${ext}`;
            if (existingSet.has(candidate)) {
                matchedFilename = candidate;
                break;
            }
        }

        // 2. Ищем по img_<русское название>_<hash>.ext через slugify
        if (!matchedFilename) {
            const candidates = candidateMap.get(article.slug) || [];
            if (candidates.length === 1) {
                matchedFilename = candidates[0];
            } else if (candidates.length > 1) {
                // если совпадений несколько — берём png/jpg по приоритету
                matchedFilename =
                    candidates.find((f) => f.endsWith(".png")) ||
                    candidates.find((f) => f.endsWith(".jpg")) ||
                    candidates.find((f) => f.endsWith(".jpeg")) ||
                    candidates[0];
            }
        }

        if (matchedFilename) {
            const newUrl = `/images/articles/${encodeURIComponent(matchedFilename)}`;

            await prisma.article.update({
                where: { id: article.id },
                data: { imageUrl: newUrl },
            });

            fixed += 1;
            console.log(`FIXED: ${article.title}`);
            console.log(`  old: ${article.imageUrl}`);
            console.log(`  new: ${newUrl}`);
        } else {
            unresolved += 1;
            console.log(`UNRESOLVED: ${article.title}`);
            console.log(`  slug: ${article.slug}`);
            console.log(`  old:  ${article.imageUrl}`);
        }
    }

    console.log("\nГотово:");
    console.log(`  broken: ${broken}`);
    console.log(`  fixed: ${fixed}`);
    console.log(`  unresolved: ${unresolved}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });