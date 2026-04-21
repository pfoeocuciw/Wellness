const { PrismaClient } = require("@prisma/client");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const AVATAR_DIR = path.join(__dirname, "../../public/uploads/avatars");

const DOCUMENTS_DIR = path.join(__dirname, "../../public/uploads/verification-documents");

if (!fs.existsSync(DOCUMENTS_DIR)) {
    fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
}

if (!fs.existsSync(AVATAR_DIR)) {
    fs.mkdirSync(AVATAR_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, AVATAR_DIR);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
        const safeExt = [".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? ext : ".jpg";
        cb(null, `avatar_${req.user.userId}_${Date.now()}${safeExt}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype && file.mimetype.startsWith("image/")) {
            cb(null, true);
            return;
        }
        cb(new Error("Можно загружать только изображения"));
    },
});

const documentStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, DOCUMENTS_DIR);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || "").toLowerCase() || ".pdf";
        const safeExt = [".pdf", ".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? ext : ".pdf";
        cb(null, `verification_${req.user.userId}_${Date.now()}${safeExt}`);
    },
});

async function uploadVerificationDocument(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Файл не загружен" });
        }

        const fileUrl = `/uploads/verification-documents/${req.file.filename}`;

        await prisma.user.update({
            where: { id: req.user.userId },
            data: {
                role: "expert",
                is_verified: false,
                diploma_info: fileUrl,
            },
        });

        return res.json({
            message: "Документ успешно загружен",
            fileUrl,
            fileName: req.file.originalname,
        });
    } catch (error) {
        console.error("uploadVerificationDocument error:", error);
        return res.status(500).json({
            message: "Ошибка загрузки документа",
            error: error.message,
        });
    }
}

const documentUpload = multer({
    storage: documentStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowedMimeTypes = [
            "application/pdf",
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
        ];

        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
            return;
        }

        cb(new Error("Можно загружать только PDF или изображения"));
    },
});

function formatProfileResponse(user) {
    return {
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
        avatarUrl: user.avatarUrl || null,
        interests: (user.interesting_categories || []).map((item) => item.category),
        expert_document_url: user.expert_document_url || null,
        expert_document_name: user.expert_document_name || null,
        expert_verification_note: user.expert_verification_note || null,
    };
}

async function applyExpertVerification(req, res) {
    try {
        const userId = req.user.userId;
        const {
            educationDescription,
            verified,
            message,
            savedPath,
            fileName,
        } = req.body;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                interesting_categories: {
                    include: { category: true },
                },
            },
        });

        if (!user) {
            return res.status(404).json({ message: "Пользователь не найден" });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                role: verified ? "expert" : "user",
                is_verified: Boolean(verified),
                diploma_info: educationDescription ? String(educationDescription).trim() : user.diploma_info,
                expert_document_url: savedPath || null,
                expert_document_name: fileName || null,
                expert_verification_note: message || null,
            },
            include: {
                interesting_categories: {
                    include: { category: true },
                },
            },
        });

        return res.json({
            message: verified ? "Диплом подтверждён" : "Диплом не подошёл",
            profile: formatProfileResponse(updatedUser),
        });
    } catch (error) {
        console.error("applyExpertVerification error:", error);
        return res.status(500).json({
            message: "Ошибка применения результата проверки",
            error: error.message,
        });
    }
}

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

        return res.json(formatProfileResponse(user));
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
        const { firstName, lastName, email, bio, diplomaInfo, role } = req.body;

        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!currentUser) {
            return res.status(404).json({ message: "Пользователь не найден" });
        }

        const data = {};

        if (firstName !== undefined) {
            data.first_name = String(firstName).trim();
        }

        if (lastName !== undefined) {
            data.last_name = String(lastName).trim();
        }

        if (email !== undefined) {
            const normalizedEmail = String(email).trim().toLowerCase();

            if (!normalizedEmail) {
                return res.status(400).json({ message: "Email не может быть пустым" });
            }

            if (normalizedEmail !== currentUser.email) {
                const emailTaken = await prisma.user.findFirst({
                    where: {
                        email: normalizedEmail,
                        NOT: { id: userId },
                    },
                });

                if (emailTaken) {
                    return res.status(400).json({ message: "Этот email уже занят" });
                }
            }

            data.email = normalizedEmail;
        }

        if (role !== undefined) {
            if (role !== "user" && role !== "expert") {
                return res.status(400).json({ message: "Некорректная роль" });
            }

            data.role = role;
            data.is_verified = false;
        }

        if (bio !== undefined) {
            data.bio = bio ? String(bio).trim() : null;
        }

        if (diplomaInfo !== undefined) {
            data.diploma_info = diplomaInfo ? String(diplomaInfo).trim() : null;

            if (data.diploma_info) {
                data.role = "expert";
                data.is_verified = false;
            }
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

        return res.json(formatProfileResponse(user));
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

async function uploadAvatar(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Файл не загружен" });
        }

        const currentUser = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: { avatarUrl: true },
        });

        if (currentUser?.avatarUrl) {
            const oldFilename = path.basename(currentUser.avatarUrl);
            const oldPath = path.join(AVATAR_DIR, oldFilename);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }

        const avatarUrl = `/uploads/avatars/${req.file.filename}`;

        await prisma.user.update({
            where: { id: req.user.userId },
            data: { avatarUrl },
        });

        return res.json({
            message: "Аватар обновлён",
            avatarUrl,
        });
    } catch (error) {
        console.error("uploadAvatar error:", error);
        return res.status(500).json({
            message: "Ошибка загрузки аватара",
            error: error.message,
        });
    }
}

async function changePassword(req, res) {
    try {
        const userId = req.user.userId;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Заполните все поля" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "Новый пароль должен быть не короче 6 символов" });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return res.status(404).json({ message: "Пользователь не найден" });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: "Неверный текущий пароль" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });

        return res.json({ message: "Пароль успешно изменён" });
    } catch (error) {
        console.error("changePassword error:", error);
        return res.status(500).json({
            message: "Ошибка смены пароля",
            error: error.message,
        });
    }
}

async function deleteMe(req, res) {
    try {
        const userId = req.user.userId;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, deleted_flag: true, avatarUrl: true },
        });

        if (!user) {
            return res.status(404).json({ message: "Пользователь не найден" });
        }

        if (user.deleted_flag === "true") {
            return res.status(400).json({ message: "Аккаунт уже удалён" });
        }

        await prisma.user.update({
            where: { id: userId },
            data: {
                deleted_flag: "true",
                is_verified: false,
                is_email_verified: false,
            },
        });

        return res.json({ message: "Аккаунт удалён" });
    } catch (error) {
        console.error("deleteMe error:", error);
        return res.status(500).json({
            message: "Ошибка удаления аккаунта",
            error: error.message,
        });
    }
}

module.exports = {
    getMe,
    updateMe,
    updateInterests,
    uploadAvatar,
    uploadVerificationDocument,
    applyExpertVerification,
    changePassword,
    deleteMe,
    upload,
    documentUpload,
};