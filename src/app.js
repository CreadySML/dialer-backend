const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const routes = require("./routes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

// CORS — accept comma-separated list in CLIENT_ORIGIN, else reflect any origin.
// Reflecting origin (instead of "*") is required because credentials: true.
const allowedOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // No origin (curl, server-to-server) → allow
      if (!origin) return cb(null, true);
      // Whitelist set → enforce
      if (allowedOrigins.length > 0) {
        return cb(null, allowedOrigins.includes(origin));
      }
      // Dev default: reflect any origin (LAN-friendly)
      return cb(null, true);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"));

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
