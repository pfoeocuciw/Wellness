const express = require("express");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            orderBy: { id: "asc" },
        });

        return res.json(categories);
    } catch (error) {
        console.error("get categories error:", error);
        return res.status(500).json({
            message: "Ошибка загрузки категорий",
            error: error.message,
        });
    }
});

module.exports = router;