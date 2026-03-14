const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function getMe(req, res) {
    try {
        const userId = req.user.userId;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                interesting_categories: {
                    include: {
                        category: true,
                    },
                },
            },
        });

        if (!user) {
            return res.status(404).json({ message: "Пользователь не найден" });
        }

        return res.json({
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            is_verified: user.is_verified,
            is_email_verified: user.is_email_verified,
            diploma_info: user.diploma_info,
            bio: user.bio,
            created_at: user.created_at,
            interests: user.interesting_categories.map((item) => item.category),
        });
    } catch (error) {
        console.error("getMe error:", error);
        return res.status(500).json({
            message: "Ошибка загрузки профиля",
            error: error.message,
        });
    }
}

async function updateMe(req, res) {
    try {
        const userId = req.user.userId;
        const { firstName, lastName, bio, diplomaInfo } = req.body;

        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!currentUser) {
            return res.status(404).json({ message: "Пользователь не найден" });
        }

        const data = {};

        if (firstName !== undefined) data.first_name = String(firstName).trim();
        if (lastName !== undefined) data.last_name = String(lastName).trim();
        if (bio !== undefined) data.bio = bio ? String(bio).trim() : null;

        if (diplomaInfo !== undefined) {
            if (currentUser.role !== "expert") {
                return res.status(400).json({ message: "Только эксперт может менять diplomaInfo" });
            }
            data.diploma_info = diplomaInfo ? String(diplomaInfo).trim() : null;
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data,
            include: {
                interesting_categories: {
                    include: {
                        category: true,
                    },
                },
            },
        });

        return res.json({
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            is_verified: user.is_verified,
            is_email_verified: user.is_email_verified,
            diploma_info: user.diploma_info,
            bio: user.bio,
            created_at: user.created_at,
            interests: user.interesting_categories.map((item) => item.category),
        });
    } catch (error) {
        console.error("updateMe error:", error);
        return res.status(500).json({
            message: "Ошибка обновления профиля",
            error: error.message,
        });
    }
}

async function updateInterests(req, res) {
    try {
        const userId = req.user.userId;
        const { categoryIds } = req.body;

        if (!Array.isArray(categoryIds)) {
            return res.status(400).json({ message: "categoryIds должен быть массивом" });
        }

        const categories = await prisma.category.findMany({
            where: {
                id: { in: categoryIds },
            },
        });

        const foundIds = categories.map((c) => c.id);
        const missingIds = categoryIds.filter((id) => !foundIds.includes(id));

        if (missingIds.length > 0) {
            return res.status(400).json({
                message: "Некоторые категории не найдены",
                missingIds,
            });
        }

        await prisma.userInterestingCategory.deleteMany({
            where: { user_id: userId },
        });

        if (categoryIds.length > 0) {
            await prisma.userInterestingCategory.createMany({
                data: categoryIds.map((categoryId) => ({
                    user_id: userId,
                    category_id: categoryId,
                })),
                skipDuplicates: true,
            });
        }

        return res.json({ message: "Интересы обновлены" });
    } catch (error) {
        console.error("updateInterests error:", error);
        return res.status(500).json({
            message: "Ошибка обновления интересов",
            error: error.message,
        });
    }
}

module.exports = {
    getMe,
    updateMe,
    updateInterests,
};