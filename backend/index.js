import cors from "cors";
import express from "express";
import dotenv, { config } from "dotenv";
import mongoose from "mongoose";
import morgan from "morgan";

import routes from "./routes/index.js";

dotenv.config()

const app = express()

app.use(cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "DELETE", "PUT"],
    allowedHeaders: ['content-type', "Authorization"],
}))

app.use(morgan("dev"));

//DB connection
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("DB connected successfully"))
    .catch((err) => console.log("Failed to connect to DB:", err));

app.use(express.json())

const PORT = process.env.PORT || 5000

app.get("/", async (req, res) => {
    res.status(200).json({
        message: "Welcome to TaskHub API"
    });
});
//http:localhost:5000/api-v1/
app.use("/api-v1", routes);

//error middleware
app.use((err, req, res, next) => {
    console.log(err.stack)
    res.status(500).json({ message: "internal Server error"});
});

//Not found middleware
app.use((req, res) => {
    res.status(404).json({ message: "Not found"})
})

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});