const express = require("express");
const {
    register,
    verifyEmail,
    resendVerificationCode,
    login,
    restoreAccount,
} = require("../controllers/auth.controller");

const router = express.Router();

router.post("/register", register);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationCode);
router.post("/login", login);
router.post("/restore-account", restoreAccount);

module.exports = router;