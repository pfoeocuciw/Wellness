const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function parseBool(value, fallback = false) {
    if (value === undefined || value === null || value === "") return fallback;
    const v = String(value).trim().toLowerCase();
    return ["1", "true", "yes", "y", "on"].includes(v);
}

function isGmailConfig(host, user) {
    const h = (host || "").toLowerCase();
    const u = (user || "").toLowerCase();
    return h.includes("gmail") || u.endsWith("@gmail.com");
}

function mapSmtpErrorToPublicMessage(error, smtpHost, smtpUser) {
    if (!error) return null;

    if (error.code === "EAUTH") {
        if (isGmailConfig(smtpHost, smtpUser)) {
            return "Не удалось авторизоваться в Gmail SMTP. Для Gmail нужен App Password (16 символов) при включенной 2FA, обычный пароль аккаунта не подойдет.";
        }
        return "Не удалось авторизоваться на SMTP-сервере. Проверьте SMTP_USER/SMTP_PASS.";
    }

    if (error.code === "ESOCKET" || error.code === "ECONNECTION" || error.code === "ETIMEDOUT") {
        return "Не удалось подключиться к SMTP-серверу. Проверьте SMTP_HOST/SMTP_PORT и сетевой доступ.";
    }

    return null;
}

function getSmtpConfig() {
    const smtpHost = (process.env.SMTP_HOST || "").trim();
    const smtpUser = (process.env.SMTP_USER || "").trim();
    let smtpPass = (process.env.SMTP_PASS || "").trim();
    const smtpFrom = (process.env.SMTP_FROM || "").trim();
    const smtpPort = Number(process.env.SMTP_PORT || 587);
    const smtpSecure = parseBool(process.env.SMTP_SECURE, smtpPort === 465);

    // Частая ошибка с Gmail App Password: копируют пароль с пробелами.
    if (isGmailConfig(smtpHost, smtpUser)) {
        smtpPass = smtpPass.replace(/\s+/g, "");
    }

    const missing = [];
    if (!smtpHost) missing.push("SMTP_HOST");
    if (!smtpUser) missing.push("SMTP_USER");
    if (!smtpPass) missing.push("SMTP_PASS");
    if (!smtpFrom) missing.push("SMTP_FROM");

    if (missing.length > 0) {
        throw new Error(`SMTP is not configured. Missing env vars: ${missing.join(", ")}`);
    }

    return {
        smtpHost,
        smtpUser,
        smtpPass,
        smtpFrom,
        smtpPort,
        smtpSecure,
    };
}

function createTransporter() {
    const cfg = getSmtpConfig();
    return nodemailer.createTransport({
        host: cfg.smtpHost,
        port: cfg.smtpPort,
        secure: cfg.smtpPort === 465,
        auth: {
            user: cfg.smtpUser,
            pass: cfg.smtpPass,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
    });
}

async function sendVerificationEmail(email, code) {
    const cfg = getSmtpConfig();
    const transporter = createTransporter();

    try {
        console.log("SMTP verify start", {
            host: cfg.smtpHost,
            port: cfg.smtpPort,
            secure: cfg.smtpPort === 587,
            user: cfg.smtpUser,
        });
        console.log("sendMail start", email);
        await transporter.sendMail({
            from: `Wellness <${cfg.smtpFrom}>`,
            to: email,
            subject: "Код подтверждения Wellness",
            text: `Ваш код подтверждения: ${code}. Код действует 10 минут.`,
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
    } catch (error) {
        const msg = mapSmtpErrorToPublicMessage(error, cfg.smtpHost, cfg.smtpUser);
        if (msg) {
            const wrapped = new Error(msg);
            wrapped.code = error.code;
            throw wrapped;
        }
        throw error;
    }
    console.log("SMTP verify ok");
}

async function register(req, res) {
    try {
        const { email, password, firstName, lastName } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email и пароль обязательны" });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (existingUser && existingUser.deleted_flag === "true") {
            return res.status(409).json({
                message: "Аккаунт с этой почтой был удалён",
                restoreAvailable: true,
                email: existingUser.email,
            });
        }

        if (existingUser) {
            if (existingUser.is_email_verified) {
                return res.status(409).json({ message: "Пользователь с такой почтой уже существует" });
            }

            const code = generateCode();

            await prisma.emailVerificationCode.create({
                data: {
                    user_id: existingUser.id,
                    email: existingUser.email,
                    code,
                    expires_at: new Date(Date.now() + 10 * 60 * 1000),
                    used: false,
                },
            });

            await sendVerificationEmail(existingUser.email, code);

            return res.status(200).json({
                message: "Аккаунт уже создан, отправили новый код подтверждения",
                email: existingUser.email,
            });
        }


        const passwordHash = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email: normalizedEmail,
                password: passwordHash,
                first_name: firstName?.trim() || "",
                last_name: lastName?.trim() || "",
                role: "user",
                is_verified: false,
                is_email_verified: false,
                diploma_info: null,
                bio: null,
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
            error: error.message || "Неизвестная ошибка",
        });
    }
}

async function restoreAccount(req, res) {
    try {
        const { email, password, firstName, lastName } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email и пароль обязательны" });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (!user) {
            return res.status(404).json({ message: "Аккаунт не найден" });
        }

        if (user.deleted_flag !== "true") {
            return res.status(403).json({
                message: "Этот аккаунт не удалён",
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const restoredUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                password: passwordHash,
                first_name: firstName?.trim() || user.first_name || "",
                last_name: lastName?.trim() || user.last_name || "",
                deleted_flag: "false",
                role: "user",
                is_verified: false,
                is_email_verified: false,
                email_verified_at: null,
                diploma_info: null,
            },
        });

        const code = generateCode();

        await prisma.emailVerificationCode.create({
            data: {
                user_id: restoredUser.id,
                email: restoredUser.email,
                code,
                expires_at: new Date(Date.now() + 10 * 60 * 1000),
                used: false,
            },
        });

        await sendVerificationEmail(restoredUser.email, code);

        return res.status(200).json({
            message: "Аккаунт восстановлен. Код подтверждения отправлен на почту",
            email: restoredUser.email,
        });
    } catch (error) {
        console.error("restoreAccount error:", error);
        return res.status(500).json({
            message: "Ошибка восстановления аккаунта",
            error: error.message || "Неизвестная ошибка",
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

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                is_email_verified: true,
                email_verified_at: new Date(),
            },
        });

        const token = jwt.sign(
            {
                userId: updatedUser.id,
                email: updatedUser.email,
                role: updatedUser.role,
            },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.json({
            message: "Почта подтверждена",
            token,
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                first_name: updatedUser.first_name,
                last_name: updatedUser.last_name,
                role: updatedUser.role,
                is_verified: updatedUser.is_verified,
                is_email_verified: updatedUser.is_email_verified,
                avatarUrl: updatedUser.avatarUrl || null,
            },
        });
    } catch (error) {
        console.error("verifyEmail error:", error);
        return res.status(500).json({
            message: "Ошибка подтверждения",
            error: error.message,
        });
    }
}

async function resendVerificationCode(req, res) {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email обязателен" });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (!user) {
            return res.status(404).json({ message: "Пользователь не найден" });
        }

        if (user.is_email_verified) {
            return res.status(400).json({ message: "Почта уже подтверждена" });
        }

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

        return res.json({ message: "Новый код отправлен", email: user.email });
    } catch (error) {
        console.error("resendVerificationCode error:", error);
        return res.status(500).json({
            message: "Ошибка повторной отправки кода",
            error: error.message || "Неизвестная ошибка",
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

        if (user.deleted_flag === "true") {
            return res.status(403).json({
                message: "Этот аккаунт удалён. Зарегистрируйтесь снова, чтобы восстановить его.",
                restoreAvailable: true,
            });
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
                avatarUrl: user.avatarUrl || null,
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
    restoreAccount,
    verifyEmail,
    resendVerificationCode,
    login,
};