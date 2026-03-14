const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

const smtpPort = Number(process.env.SMTP_PORT || 465);

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

async function sendVerificationEmail(email, code) {
    await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: "Код подтверждения Wellness",
        html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Подтверждение почты</h2>
        <p>Ваш код подтверждения:</p>
        <div style="font-size: 28px; font-weight: 700; letter-spacing: 4px; margin: 12px 0;">
          ${code}
        </div>
        <p>Код действует 10 минут.</p>
      </div>
    `,
    });
}

async function register(req, res) {
    try {
        const { email, password, firstName, lastName, role, diplomaInfo, bio } = req.body;

        if (!email || !password || !firstName || !lastName || !role) {
            return res.status(400).json({ message: "Заполни все обязательные поля" });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (existingUser) {
            return res.status(409).json({ message: "Пользователь с такой почтой уже существует" });
        }

        if (role === "expert" && !diplomaInfo) {
            return res.status(400).json({ message: "Для эксперта нужно указать diplomaInfo" });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email: normalizedEmail,
                password: passwordHash,
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                role,
                is_verified: false,
                is_email_verified: false,
                diploma_info: role === "expert" ? (diplomaInfo || null) : null,
                bio: role === "expert" ? (bio || null) : null,
            },
        });

        const code = generateCode();

        await prisma.emailVerificationCode.create({
            data: {
                user_id: user.id,
                email: user.email,
                code,
                expires_at: new Date(Date.now() + 10 * 60 * 1000),
                used: false,
            },
        });

        await sendVerificationEmail(user.email, code);

        return res.status(201).json({
            message: "Код подтверждения отправлен на почту",
            email: user.email,
        });
    } catch (error) {
        console.error("register error:", error);
        return res.status(500).json({
            message: "Ошибка регистрации",
            error: error.message,
        });
    }
}

async function verifyEmail(req, res) {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            return res.status(400).json({ message: "Email и код обязательны" });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (!user) {
            return res.status(404).json({ message: "Пользователь не найден" });
        }

        const verification = await prisma.emailVerificationCode.findFirst({
            where: {
                email: normalizedEmail,
                code,
                used: false,
            },
            orderBy: {
                created_at: "desc",
            },
        });

        if (!verification) {
            return res.status(400).json({ message: "Неверный код" });
        }

        if (verification.expires_at < new Date()) {
            return res.status(400).json({ message: "Код истёк" });
        }

        await prisma.emailVerificationCode.update({
            where: { id: verification.id },
            data: { used: true },
        });

        await prisma.user.update({
            where: { id: user.id },
            data: {
                is_email_verified: true,
                email_verified_at: new Date(),
            },
        });

        return res.json({ message: "Почта подтверждена" });
    } catch (error) {
        console.error("verifyEmail error:", error);
        return res.status(500).json({
            message: "Ошибка подтверждения",
            error: error.message,
        });
    }
}

async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email и пароль обязательны" });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (!user) {
            return res.status(401).json({ message: "Неверная почта или пароль" });
        }

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            return res.status(401).json({ message: "Неверная почта или пароль" });
        }

        if (!user.is_email_verified) {
            return res.status(403).json({ message: "Сначала подтверди почту" });
        }

        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role,
            },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
            },
        });
    } catch (error) {
        console.error("login error:", error);
        return res.status(500).json({
            message: "Ошибка входа",
            error: error.message,
        });
    }
}

module.exports = {
    register,
    verifyEmail,
    login,
};