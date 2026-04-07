const express = require("express");
const authMiddleware = require("../middleware/auth");
const {
    getMe,
    updateMe,
    updateInterests,
    uploadAvatar,
    changePassword,
    deleteMe,
    upload,
} = require("../controllers/profile.controller");

const router = express.Router();

router.delete("/me", authMiddleware, deleteMe);
router.get("/me", authMiddleware, getMe);
router.patch("/me", authMiddleware, updateMe);
router.put("/interests", authMiddleware, updateInterests);
router.post("/avatar", authMiddleware, upload.single("avatar"), uploadAvatar);
router.post("/change-password", authMiddleware, changePassword);

module.exports = router;