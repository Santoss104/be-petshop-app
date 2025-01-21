const chatModel = require("../models/chatModel");
const bookingModel = require("../models/bookingModel");
const ErrorHandler = require("../utils/errorHandler");
const { CatchAsyncError } = require("../middlewares/catchAsyncError");
const { redis } = require("../utils/redis");

const initializeChat = CatchAsyncError(async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    const booking = await bookingModel.findById(bookingId);
    if (!booking) {
      return next(new ErrorHandler("Booking not found", 404));
    }

    let chat = await chatModel.findOne({ booking: bookingId });
    if (chat) {
      return next(new ErrorHandler("Chat already exists", 400));
    }

    chat = await chatModel.create({
      booking: bookingId,
      user: booking.user,
      doctor: booking.doctor,
    });

    await redis.set(`chat:${chat._id}`, JSON.stringify(chat));

    res.status(201).json({
      success: true,
      chat,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

const sendMessage = CatchAsyncError(async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { content } = req.body;

    const chat = await chatModel.findById(chatId);
    if (!chat) {
      return next(new ErrorHandler("Chat not found", 404));
    }

    const senderModel = req.user.role === "doctor" ? "Doctor" : "User";

    const message = {
      sender: req.user._id,
      senderModel,
      content,
    };

    chat.messages.push(message);
    chat.lastMessage = Date.now();
    await chat.save();

    await redis.set(`chat:${chatId}`, JSON.stringify(chat));

    res.status(200).json({
      success: true,
      message,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

const getChatHistory = CatchAsyncError(async (req, res, next) => {
  try {
    const { chatId } = req.params;

    const chat = await chatModel
      .findById(chatId)
      .populate("user", "name avatar")
      .populate("doctor", "name avatar")
      .populate("booking", "appointmentDate appointmentTime");

    if (!chat) {
      return next(new ErrorHandler("Chat not found", 404));
    }

    const isAuthorized =
      chat.user._id.toString() === req.user._id.toString() ||
      chat.doctor._id.toString() === req.user._id.toString();

    if (!isAuthorized) {
      return next(new ErrorHandler("Not authorized", 403));
    }

    res.status(200).json({
      success: true,
      chat,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

const markMessagesAsRead = CatchAsyncError(async (req, res, next) => {
  try {
    const { chatId } = req.params;

    const chat = await chatModel.findById(chatId);
    if (!chat) {
      return next(new ErrorHandler("Chat not found", 404));
    }

    chat.messages.forEach((message) => {
      if (message.sender.toString() !== req.user._id.toString()) {
        message.readStatus = true;
      }
    });

    await chat.save();
    await redis.set(`chat:${chatId}`, JSON.stringify(chat));

    res.status(200).json({
      success: true,
      message: "Messages marked as read",
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

module.exports = {
  initializeChat,
  sendMessage,
  getChatHistory,
  markMessagesAsRead,
};