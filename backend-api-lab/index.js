import express from "express";
import { router } from "./routes.js";

const app = express();
app.use(router);

const port = process.env.PORT || 5050;
app.listen(port, () => console.log("API listening on", port));
