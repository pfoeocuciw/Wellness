const express = require("express");
const {
    register,
    verifyEmail,
    resendVerificationCode,
    login,
    restoreAccount,
    requestPasswordReset,
    confirmPasswordReset,
} = require("../controllers/auth.controller");

const router = express.Router();

router.post("/register", register);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationCode);
router.post("/login", login);
router.post("/restore-account", restoreAccount);
router.post("/forgot-password/request", requestPasswordReset);
router.post("/forgot-password/confirm", confirmPasswordReset);

module.exports = router;