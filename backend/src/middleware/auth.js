const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Не авторизован" });
        }

        const token = authHeader.split(" ")[1];

        const payload = jwt.verify(token, process.env.JWT_SECRET);

        req.user = payload;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Неверный токен" });
    }
}

module.exports = authMiddleware;