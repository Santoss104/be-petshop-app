const express = require("express");
const {
  registrationUser,
  updatePersonalData,
  loginUser,
  logoutUser,
  getUserInfo,
  socialAuth,
  updateUserName,
  updatePassword,
  updateProfileAvatar,
} = require("../controllers/userController");
const { isAutheticated } = require("../middlewares/authMiddleware");

const userRouter = express.Router();

userRouter.post("/register", registrationUser);
userRouter.post("/update-personal-data", isAutheticated, updatePersonalData);
userRouter.post("/login", loginUser);
userRouter.get("/me", isAutheticated, getUserInfo);
userRouter.get("/logout", isAutheticated, logoutUser);
userRouter.post("/social-auth", socialAuth);
userRouter.put("/update-name", isAutheticated, updateUserName);
userRouter.put("/update-password", isAutheticated, updatePassword);
userRouter.put("/update-avatar", isAutheticated, updateProfileAvatar);

module.exports = userRouter;