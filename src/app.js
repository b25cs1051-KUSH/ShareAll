import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import { ApiResponse } from "./utils/Apiresponse.js"
import router from "./routes/user.routes.js"
import eventRouter from "./routes/event.routes.js"
const app = express()

app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true
}));

 // 2. Body Parser Middlewares
app.use(express.json({ limit: "16kb"}));
app.use(express.urlencoded({extended:true,limit:"16kb"}));
app.use(express.static("public"));  // Folder to serve static assets (e.g. temporary files)

app.use(cookieParser()); // Allows server to read & set HTTP-only cookies on req.cookies

app.get("/api/v1/healthcheck",(req,res)=>{
    return res
              .status(200)
              .json(new ApiResponse(200,{status:"OK"},"server is ready gandaa!!"));
});
app.use("/api/v1/users", router);
app.use("/api/v1/events",eventRouter);

export { app };