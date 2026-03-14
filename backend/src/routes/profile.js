const express = require("express");
const authMiddleware = require("../middleware/auth");
const {
    getMe,
    updateMe,
    updateInterests,
} = require("../controllers/profile.controller");

const router = express.Router();

router.get("/me", authMiddleware, getMe);
router.patch("/me", authMiddleware, updateMe);
router.put("/interests", authMiddleware, updateInterests);

module.exports = router;