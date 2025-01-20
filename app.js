const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

// Routes
const userRouter = require("./src/routes/userRoute");
const productRouter = require("./src/routes/productRoute");
const categoryRouter = require("./src/routes/categoryRoute")
const cartRoutes = require("./src/routes/cartRoute");
const orderRoutes = require("./src/routes/orderRoute");
const paymentRouter = require("./src/routes/paymentRoute");
const doctorRouter = require("./src/routes/doctorRoute");
const bookingRouter = require("./src/routes/bookingRoute");
const chatRouter = require("./src/routes/chatRoute");
const petRouter = require("./src/routes/petRoute");
const appoinmentRouter = require("./src/routes/appointmentRoute");

dotenv.config();

const app = express();

// body parser
app.use(express.json({ limit: "50mb" }));

// cookie parser
app.use(cookieParser());

// Konfigurasi CORS
const corsOptions = {
  origin: process.env.FRONTEND_URI || "http://localhost:19000",
  credentials: true,
};

app.use(cors(corsOptions));

// routes
app.use("/api/v1/users", userRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/payments", paymentRouter);
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/doctors", doctorRouter);
app.use("/api/v1/chats", chatRouter);
app.use("/api/v1/pets", petRouter);
app.use("/api/v1/appoinments", appoinmentRouter);

// testing api
app.get("/test", (req, res) => {
  res.status(200).json({
    succcess: true,
    message: "API is working",
  });
});

// unknown route
app.all("*", (req, res, next) => {
  const err = new Error(`Route ${req.originalUrl} not found`);
  err.statusCode = 404;
  next(err);
});

module.exports = { app };