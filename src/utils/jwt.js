const dotenv = require("dotenv");
const { redis } = require("./redis");

dotenv.config();

const accessTokenExpire = parseInt(
  process.env.ACCESS_TOKEN_EXPIRE || "300",
  10
);
const refreshTokenExpire = parseInt(
  process.env.REFRESH_TOKEN_EXPIRE || "1200",
  10
);

exports.accessTokenOptions = {
  expires: new Date(Date.now() + accessTokenExpire * 60 * 60 * 1000),
  maxAge: accessTokenExpire * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: "none",
  secure: true,
};

exports.refreshTokenOptions = {
  expires: new Date(Date.now() + refreshTokenExpire * 24 * 60 * 60 * 1000),
  maxAge: refreshTokenExpire * 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: "none",
  secure: true,
};

exports.sendToken = (user, statusCode, res, additionalData = {}) => {
  const accessToken = user.SignAccessToken();
  const refreshToken = user.SignRefreshToken();

  redis.set(user._id, JSON.stringify(user));

  if (process.env.NODE_ENV === "production") {
    exports.accessTokenOptions.secure = true;
  }

  res.cookie("access_token", accessToken, exports.accessTokenOptions);
  res.cookie("refresh_token", refreshToken, exports.refreshTokenOptions);

  res.status(statusCode).json({
    success: true,
    user,
    accessToken,
    refreshToken,
    ...additionalData,
  });
};