const express = require("express");
const cors = require("cors");

const articlesRouter = require("./routes/articles");

const app = express();

app.use(cors({
    origin: true, // для разработки
    credentials: true
}));

app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/articles", articlesRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ API running on http://localhost:${PORT}`));