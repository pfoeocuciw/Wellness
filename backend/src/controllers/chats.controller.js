const prisma = require("../prisma");

function getUserId(req) {
  const id = req?.user?.userId;
  if (!id) return null;
  return Number(id);
}

async function listChats(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Не авторизован" });

    const chats = await prisma.chat.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    return res.json({
      chats: chats.map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        lastMessageAt: c.messages[0]?.createdAt ?? null,
      })),
    });
  } catch (error) {
    console.error("listChats error:", error);
    return res.status(500).json({ message: "Ошибка получения чатов" });
  }
}

async function createChat(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Не авторизован" });

    const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    const safeTitle = title || "Новый чат";

    const chat = await prisma.chat.create({
      data: { userId, title: safeTitle },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });

    return res.status(201).json({ chat });
  } catch (error) {
    console.error("createChat error:", error);
    return res.status(500).json({ message: "Ошибка создания чата" });
  }
}

async function getChat(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Не авторизован" });

    const { id } = req.params;
    const chat = await prisma.chat.findFirst({
      where: { id, userId },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: "asc" },
          select: { id: true, role: true, text: true, createdAt: true },
        },
      },
    });

    if (!chat) return res.status(404).json({ message: "Чат не найден" });
    return res.json({ chat });
  } catch (error) {
    console.error("getChat error:", error);
    return res.status(500).json({ message: "Ошибка получения чата" });
  }
}

async function addMessage(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Не авторизован" });

    const { id: chatId } = req.params;
    const role = typeof req.body?.role === "string" ? req.body.role : "";
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";

    if (!text) return res.status(400).json({ message: "Пустое сообщение" });
    if (role !== "user" && role !== "assistant") {
      return res.status(400).json({ message: "Некорректная роль" });
    }

    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId }, select: { id: true } });
    if (!chat) return res.status(404).json({ message: "Чат не найден" });

    const message = await prisma.chatMessage.create({
      data: { chatId, role, text },
      select: { id: true, chatId: true, role: true, text: true, createdAt: true },
    });

    // bump updatedAt
    await prisma.chat.update({ where: { id: chatId }, data: {} });

    return res.status(201).json({ message });
  } catch (error) {
    console.error("addMessage error:", error);
    return res.status(500).json({ message: "Ошибка сохранения сообщения" });
  }
}

async function updateChat(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Не авторизован" });

    const { id } = req.params;
    const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    if (!title) return res.status(400).json({ message: "Пустой заголовок" });

    const chat = await prisma.chat.findFirst({ where: { id, userId }, select: { id: true } });
    if (!chat) return res.status(404).json({ message: "Чат не найден" });

    const updated = await prisma.chat.update({
      where: { id },
      data: { title },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });

    return res.json({ chat: updated });
  } catch (error) {
    console.error("updateChat error:", error);
    return res.status(500).json({ message: "Ошибка обновления чата" });
  }
}

async function deleteChat(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Не авторизован" });

    const { id } = req.params;
    const chat = await prisma.chat.findFirst({ where: { id, userId }, select: { id: true } });
    if (!chat) return res.status(404).json({ message: "Чат не найден" });

    await prisma.chat.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (error) {
    console.error("deleteChat error:", error);
    return res.status(500).json({ message: "Ошибка удаления чата" });
  }
}

module.exports = {
  listChats,
  createChat,
  getChat,
  addMessage,
  updateChat,
  deleteChat,
};

