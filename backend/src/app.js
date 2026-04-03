const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");

const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const scoreRoutes = require("./routes/score.routes");
const { notFoundHandler } = require("./middleware/notFound");
const { errorHandler } = require("./middleware/errorHandler");

dotenv.config();

const app = express();

app.set("port", process.env.PORT || 5000);

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/score", scoreRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
