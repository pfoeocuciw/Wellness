const express = require("express");
const authMiddleware = require("../middleware/auth");
const {
  listChats,
  createChat,
  getChat,
  addMessage,
  updateChat,
  deleteChat,
} = require("../controllers/chats.controller");

const router = express.Router();

router.get("/", authMiddleware, listChats);
router.post("/", authMiddleware, createChat);
router.get("/:id", authMiddleware, getChat);
router.post("/:id/messages", authMiddleware, addMessage);
router.patch("/:id", authMiddleware, updateChat);
router.delete("/:id", authMiddleware, deleteChat);

module.exports = router;

