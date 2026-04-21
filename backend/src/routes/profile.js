const express = require("express");
const authMiddleware = require("../middleware/auth");
const {
    getMe,
    updateMe,
    updateInterests,
    uploadAvatar,
    uploadVerificationDocument,
    changePassword,
    deleteMe,
    upload,
    documentUpload,
    applyExpertVerification,
} = require("../controllers/profile.controller");

const router = express.Router();

router.delete("/me", authMiddleware, deleteMe);
router.get("/me", authMiddleware, getMe);
router.patch("/me", authMiddleware, updateMe);
router.put("/interests", authMiddleware, updateInterests);
router.post("/avatar", authMiddleware, upload.single("avatar"), uploadAvatar);
router.post("/change-password", authMiddleware, changePassword);
router.post(
    "/upload-document",
    authMiddleware,
    documentUpload.single("document"),
    uploadVerificationDocument
);
router.post("/apply-expert-verification", authMiddleware, applyExpertVerification);

module.exports = router;