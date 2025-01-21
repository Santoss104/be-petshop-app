const dotenv = require("dotenv");
const userModel = require("../models/userModel");
const ErrorHandler = require("../utils/errorHandler");
const { CatchAsyncError } = require("../middlewares/catchAsyncError");
const jwt = require("jsonwebtoken");
const { sendToken } = require("../utils/jwt");
const { redis } = require("../utils/redis");
const cloudinary = require("cloudinary");
const { getAllUsersService, getUserById } = require("../services/userService");

dotenv.config();

const registrationUser = CatchAsyncError(async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return next(new ErrorHandler("Please enter all fields", 400));
    }

    const isEmailExist = await userModel.findOne({ email });
    if (isEmailExist) {
      return next(new ErrorHandler("Email already exists", 400));
    }

    const user = await userModel.create({
      name,
      email,
      password,
    });

    await redis.set(user._id, JSON.stringify(user));

    sendToken(user, 201, res);

    res.status(201).json({
      success: true,
      message: "Registration successful",
      user: {
        name: user.name,
        phone: user.phone,
        birthDate: user.birthDate,
        gender: user.gender,
      },
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

const updatePersonalData = CatchAsyncError(async (req, res, next) => {
  try {
    const { phone, birthDate, gender } = req.body;
    const userId = req.user?._id;

    if (!phone || !birthDate || !gender) {
      return next(new ErrorHandler("Please enter all fields", 400));
    }

    const user = await userModel.findById(userId);
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    user.phone = phone;
    user.birthDate = birthDate;
    user.gender = gender;

    await user.save();
    await redis.set(userId, JSON.stringify(user));

    res.status(200).json({
      success: true,
      message: "Personal data updated successfully",
      user,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

const loginUser = CatchAsyncError(async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new ErrorHandler("Please enter email and password", 400));
    }

    const user = await userModel.findOne({ email }).select("+password");

    if (!user) {
      return next(new ErrorHandler("Invalid email or password", 400));
    }

    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return next(new ErrorHandler("Invalid email or password", 400));
    }

    await redis.set(user._id, JSON.stringify(user));

    sendToken(user, 201, res);
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

const logoutUser = CatchAsyncError(async (req, res, next) => {
  try {
    res.cookie("access_token", "", { maxAge: 1 });
    res.cookie("refresh_token", "", { maxAge: 1 });

    const userId = req.user?._id;
    if (userId) {
      await redis.del(userId);
    }

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

const getUserInfo = CatchAsyncError(async (req, res, next) => {
  try {
    const userId = req.user?._id;
    getUserById(userId, res);
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

const socialAuth = CatchAsyncError(async (req, res, next) => {
  try {
    const { email, name, avatar } = req.body;
    const user = await userModel.findOne({ email });
    if (!user) {
      const newUser = await userModel.create({ email, name, avatar });
      sendToken(newUser, 200, res);
    } else {
      sendToken(user, 200, res);
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

const updatePassword = CatchAsyncError(async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return next(new ErrorHandler("Please enter old and new password", 400));
    }

    const user = await userModel.findById(req.user?._id).select("+password");

    if (user?.password === undefined) {
      return next(new ErrorHandler("Invalid user", 400));
    }

    const isPasswordMatch = await user?.comparePassword(oldPassword);

    if (!isPasswordMatch) {
      return next(new ErrorHandler("Invalid old password", 400));
    }

    user.password = newPassword;

    await user.save();

    await redis.set(req.user?._id, JSON.stringify(user));

    res.status(201).json({
      success: true,
      user,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

const updateUserName = CatchAsyncError(async (req, res, next) => {
  try {
    const { name } = req.body;
    const userId = req.user?._id;
    const user = await userModel.findById(userId);

    if (name && user) {
      user.name = name;
    }

    await user?.save();

    await redis.set(userId, JSON.stringify(user));

    res.status(201).json({
      success: true,
      user,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

const updateProfileAvatar = CatchAsyncError(async (req, res, next) => {
  try {
    const { avatar } = req.body;
    const userId = req.user?._id;
    const user = await userModel.findById(userId).select("+password");

    if (avatar && user) {
      if (user?.avatar?.public_id) {
        await cloudinary.v2.uploader.destroy(user?.avatar?.public_id);

        const myCloud = await cloudinary.v2.uploader.upload(avatar, {
          folder: "avatars",
          width: 150,
        });
        user.avatar = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      } else {
        const myCloud = await cloudinary.v2.uploader.upload(avatar, {
          folder: "avatars",
          width: 150,
        });
        user.avatar = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      }
    }

    await user?.save();

    await redis.set(userId, JSON.stringify(user));

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

const updateAccessToken = CatchAsyncError(async (req, res, next) => {
  try {
    const refresh_token = req.headers["refresh-token"];
    const decoded = jwt.verify(refresh_token, process.env.REFRESH_TOKEN);

    const message = "Could not refresh token";
    if (!decoded) {
      return next(new ErrorHandler(message, 400));
    }

    const session = await redis.get(decoded.id);

    if (!session) {
      return next(
        new ErrorHandler("Please login for access this resources!", 400)
      );
    }

    const user = JSON.parse(session);
    req.user = user;

    await redis.set(user._id, JSON.stringify(user), "EX", 604800);
    return next();
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

const getAllUsers = CatchAsyncError(async (req, res, next) => {
  try {
    getAllUsersService(res);
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

module.exports = {
  registrationUser,
  updatePersonalData,
  loginUser,
  logoutUser,
  getUserInfo,
  socialAuth,
  updatePassword,
  updateUserName,
  updateProfileAvatar,
  updateAccessToken,
  getAllUsers,
};