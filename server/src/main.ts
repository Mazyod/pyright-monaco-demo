/*
 * Copyright (c) Eric Traut
 * Main entry point for the app server.
 */

import bodyParser from "body-parser";
import * as dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import * as path from "path";
import routes from "./routes";
import { logger } from "./logging";

try {
  // Load environment variables from ".env" file.
  dotenv.config();

  startService();
} catch (err) {
  logger.error(`Uncaught exception: ${err}`);
  throw err;
}

function startService() {
  const root = "./";
  const apiPort = process.env.PORT || 3000;
  const app = express();

  // Middleware to log the time taken by each request
  const requestTimeLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on("finish", () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.originalUrl} took ${duration}ms`);
    });

    next();
  };

  // Use the middleware globally.
  app.use(requestTimeLogger);

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use("/api", routes);

  app.use("*", (req, res, next) => {
    // Redirect from azurewebsites URL to custom domain.
    if (req.hostname.match("pyright-playground.azurewebsites.net")) {
      res.redirect(301, "https://pyright-play.net");
    } else {
      next();
    }
  });

  app.use(express.static(path.join(root, "dist/webapp")));

  app.get("*", (req, res) => {
    res.sendFile("dist/webapp/index.html", { root });
  });

  app.listen(apiPort, () => {
    logger.info(`API running on port ${apiPort}`);
  });
}
