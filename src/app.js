import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import { ApiResponse } from "./utils/Apiresponse.js"
import router from "./routes/user.routes.js"
import eventRouter from "./routes/event.routes.js"
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mediaRouter from "./routes/media.routes.js"


const app = express()

app.use(helmet());

const limiter = rateLimit({
  windowMs: 15*60*1000,//15mins
  max:500, // TO BE REDUCED AT THE TIME OF DEPLOYMENT!!!!!!
  standardHeaders:true,
  legacyHeaders:false,
  message:"Too many requests , please try again after 30 mins"
})

app.use(limiter);


app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true
}));

 // 2. Body Parser Middlewares
app.use(express.json({ limit: "16kb"}));
app.use(express.urlencoded({extended:true,limit:"16kb"}));
app.use(express.static("public"));  // Folder to serve static assets (e.g. temporary files)

app.use(cookieParser()); // Allows server to read & set HTTP-only cookies on req.cookies


app.use("/api/v1/users", router);
app.use("/api/v1/events",eventRouter);
app.use("/api/v1/media", mediaRouter);
//  Global Error Handler Middleware
app.use((err,req,res,next)=>{
  const statusCode = err.statusCode ||500;
  const message = err.message || "Internal server error";

  return res.status(statusCode).json({
    statusCode,
    message,
    success: false,
    errors :err.errors || []
  });
});

export { app };