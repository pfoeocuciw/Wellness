const express = require("express");
const cors = require("cors");

const articlesRouter = require("./routes/articles");
const authRouter = require("./routes/auth");
const profileRouter = require("./routes/profile");
const categoriesRouter = require("./routes/categories");

const app = express();

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/articles", articlesRouter);
app.use("/auth", authRouter);
app.use("/profile", profileRouter);
app.use("/categories", categoriesRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ API running on http://localhost:${PORT}`));