import { Router } from "express";
import {
  createEvent,
        requestToJoin,
        getPendingRequests,
        approveJoinRequest,
        rejectJoinRequest,
        removeMember,
        getMyEvents,
        toggleEventLock
} from "../controllers/event.controllers.js"
import {verifyJWT} from "../middlewares/auth.middlewares.js"

const eventRouter = Router();

eventRouter.use(verifyJWT);

eventRouter.route("/create").post(createEvent);
eventRouter.route("/request-join").post(requestToJoin);
eventRouter.route("/pending-requests/:eventId").get(getPendingRequests);
eventRouter.route("/approve-request").post(approveJoinRequest);
eventRouter.route("/reject-request").post(rejectJoinRequest);
eventRouter.route("/remove-member").post(removeMember);
eventRouter.route("/my-events").get(getMyEvents);
eventRouter.route("/toggle-lock/:eventId").patch(toggleEventLock);

export default eventRouter;