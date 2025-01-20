const express = require("express");
const { isAutheticated } = require("../middlewares/authMiddleware");
const {
  initializeChat,
  sendMessage,
  getChatHistory,
  markMessagesAsRead,
} = require("../controllers/chatController");

const chatRouter = express.Router();

chatRouter.post("/initialize", isAutheticated, initializeChat);
chatRouter.post("/:chatId/message", isAutheticated, sendMessage);
chatRouter.get("/:chatId", isAutheticated, getChatHistory);
chatRouter.put("/:chatId/read", isAutheticated, markMessagesAsRead);

module.exports = chatRouter;