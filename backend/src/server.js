const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const articlesRouter = require("./routes/articles");
const authRouter = require("./routes/auth");
const profileRouter = require("./routes/profile");
const categoriesRouter = require("./routes/categories");
const chatsRouter = require("./routes/chats");

const app = express();

const corsOriginsRaw = process.env.CORS_ORIGINS || "";
const corsOrigins = corsOriginsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

app.use(
    cors({
        origin: corsOrigins.length ? corsOrigins : true,
        credentials: true,
    })
);

app.use(express.json());

// раздача загруженных файлов
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));
// раздача статических изображений статей (seed + RSS importer кладут в public/images)
app.use("/images", express.static(path.join(__dirname, "../public/images")));

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/articles", articlesRouter);
app.use("/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/chats", chatsRouter);
app.use("/categories", categoriesRouter);
app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ API running on http://localhost:${PORT}`));