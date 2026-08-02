import { Router } from "express";
import { uploadMedia, getEventMedia, deleteMedia } from "../controllers/media.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { upload } from "../middlewares/multer.middlewares.js";

const mediaRouter = Router();

mediaRouter.use(verifyJWT);

 // Upload photo endpoint (Multer middleware handles single file upload with field name "photo")
mediaRouter.route("/upload/:eventId").post(upload.single("photo"),uploadMedia);

mediaRouter.route("/event/:eventId").get(getEventMedia);
mediaRouter.route("/:mediaId").delete(deleteMedia);

export default mediaRouter