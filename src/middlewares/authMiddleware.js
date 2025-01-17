const { CatchAsyncError } = require("../middlewares/catchAsyncError");
const ErrorHandler = require("../utils/errorHandler");
const jwt = require("jsonwebtoken");
const { redis } = require("../utils/redis");
const { updateAccessToken } = require("../controllers/userController");

// authenticated user
exports.isAutheticated = CatchAsyncError(async (req, res, next) => {
  const access_token = req.headers["access-token"] || req.cookies.access_token;

  if (!access_token) {
    return next(new ErrorHandler("Please login to access this resource", 400));
  }

  const decoded = jwt.decode(access_token);
  if (!decoded) {
    return next(new ErrorHandler("access token is not valid", 400));
  }

  if (decoded.exp && decoded.exp <= Date.now() / 1000) {
    try {
      await updateAccessToken(req, res, next);
    } catch (error) {
      return next(error);
    }
  } else {
    const user = await redis.get(decoded.id);

    if (!user) {
      return next(
        new ErrorHandler("Please login to access this resource", 400)
      );
    }

    req.user = JSON.parse(user);
    next();
  }
});