import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Event } from "../models/event.models.js";
import { ApiResponse } from "../utils/Apiresponse.js";
import mongoose, { mongo } from "mongoose";
import crypto from "crypto";

const generateUniqueInviteCode = async ()=>{
  let code ="";
  let isUnique= false;
  while(!isUnique){
    code = crypto.randomBytes(3).toString("hex").toUpperCase();
    const existing = await Event.findOne({ inviteCode:code });
    if(!existing) isUnique = true;
  }
  return code;
};

const createEvent = asyncHandler(async (req,res)=>{
  const {name, description, startDate, endDate, coverImage} = req.body;

  if(!name || name.trim()===""){
    throw new ApiError(400,"event name is required");
  }

  const inviteCode = await generateUniqueInviteCode();

  const event = await Event.create({
    name:name.trim(),
    description:description ? description.trim() : "",
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
    coverImage: coverImage||"",
    inviteCode,
    creator:req.user._id,
    admins:[req.user._id],
    members:[req.user._id], // creator should be a member
    pendingRequests:[]
    });

    return res.status(201).json(
      new ApiResponse(201,event,"event created successfully")
    );
});

const requestToJoin = asyncHandler(async (req,res)=>{
  const {inviteCode} = req.body;

  if(!inviteCode || inviteCode.trim()===""){
    throw new ApiError(400,"InviteCode is required");
  }

  const event = await Event.findOne({ inviteCode:inviteCode.trim().toUpperCase() });

  if(!event){
    throw new ApiError(404,"Invalid invite code. Event not found");
  }

  if(event.isLocked){
    throw new ApiError(403, "This event has been locked by the creator. No new members can join.");
  }

  const userIdStr = req.user._id.toString();

  if(event.members.some((id)=>id.toString() === userIdStr)){
    throw new ApiError(400, "You are already a member of this event");
  }
  if (event.pendingRequests.some((id) => id.toString() === userIdStr)) {
    throw new ApiError(400, "Join request already pending approval from event creator/admin");
  }

  event.pendingRequests.push(req.user._id);
  await event.save();

  return res.status(200).json(
    new ApiResponse(200,null,"Join request submitted. Waiting for creator approval.")
  );
});

const getPendingRequests = asyncHandler(async (req,res)=>{
  const { eventId } = req.params;

  if(!mongoose.Types.ObjectId.isValid(eventId)){
    throw new ApiError(400,"Invalid Event ID format");
  }

  const event = await Event.findById(eventId).populate("pendingRequests", "username fullName email avatar");

  if(!event){
    throw new ApiError(404, "Event not found");
  }

  const isCreatorOrAdmin = event.admins.some((id)=>id.toString() === req.user._id.toString());

  if(!isCreatorOrAdmin){
    throw new ApiError(403, "Only event creator or admins can view pending requests");
  }

  return res.status(200).json(
    new ApiResponse(200,event.pendingRequests,"Pending join requests fetched successfully")
  );
});

const approveJoinRequest = asyncHandler(async(req,res)=>{
  const { eventId,userIdToApprove }= req.body;

  if(!mongoose.Types.ObjectId.isValid(eventId) || !mongoose.Types.ObjectId.isValid(userIdToApprove) ){
    throw new ApiError(400, "Invalid Event ID or User ID");
  }

  const event = await Event.findById(eventId);

  if(!event){
    throw new ApiError(404,"event not found")
  }

  const isCreatorOrAdmin = event.admins.some((id)=>id.toString()===req.user._id.toString());

  if(!isCreatorOrAdmin){
    throw new ApiError(403,"Only event creator or admin can approve members");
  }

  event.pendingRequests=event.pendingRequests.filter(
    (id)=>id.toString()!==userIdToApprove
  );
  
  if(!event.members.some((id)=>id.toString() == userIdToApprove)){
    event.members.push(userIdToApprove);
  }
  await event.save();

  return res.status(200).json(
    new ApiResponse(200,event,"User Approved and added to event members")
  );

});

const rejectJoinRequest = asyncHandler(async(req,res)=>{
  const { eventId, userIdToReject } =req.body;

  if(!mongoose.Types.ObjectId.isValid(eventId) || !mongoose.Types.ObjectId.isValid(userIdToReject)){
    throw new ApiError(400,"invalid event id or used id");
  }

  const event = await Event.findById(eventId);

  if(!event){
    throw new ApiError(404,"event not found");
  }

  const isCreatorOrAdmin = event.admins.some((id) => id.toString() === req.user._id.toString());
        if (!isCreatorOrAdmin) {
            throw new ApiError(403, "Only event creator or admins can reject requests");
        }
    
        event.pendingRequests = event.pendingRequests.filter(
            (id) => id.toString() !== userIdToReject
        );

        await event.save();
        return res.status(200).json(
          new ApiResponse(200,null,"Join request rejected successfully")
        );
});

const removeMember = asyncHandler(async(req,res)=>{
  const {eventId,userIdToRemove}=req.body;

  if(!mongoose.Types.ObjectId.isValid(eventId) || !mongoose.Types.ObjectId.isValid(userIdToRemove)){
    throw new ApiError(400,"Invalid event or user id");
  }

  const event = await Event.findById(eventId);
  if(!event){
    throw new ApiError(404, "Event not found");
  }

  const isCreatorOrAdmin = event.admins.some((id)=>id.toString() === req.user._id.toString());

  if(!isCreatorOrAdmin){
    throw new ApiError(403, "Only event creator or admins can remove members");
  }

  if(userIdToRemove === event.creator.toString()){
    throw new ApiError(400, "Creator cannot be removed from the event");
  }

  event.members = event.members.filter(
    (id)=>id.toString()!== userIdToRemove
  );

  event.admins = event.admins.filter(
    (id)=>id.toString()!== userIdToRemove
  );

  await event.save();

  return res.status(200).json(
    new ApiResponse(200,event,"Members removed successfully")
  );

});

const toggleEventLock = asyncHandler(async(req,res)=>{
  const {eventId} = req.params;

  if(!mongoose.Types.ObjectId.isValid(eventId)){
    throw new ApiError(400,"INvalid event id format")
  }

  const event = await Event.findById(eventId);

  if(!event){
    throw new ApiError(404, "Event not found");
  }
  if(event.creator.toString() !== req.user._id.toString()){
    throw new ApiError(403, "Only event creator can lock/unlock event");
  }

  event.isLocked = !event.isLocked;
  await event.save();

  return res.status(200).json(
    new ApiResponse(200,event,`Event ${event.isLocked ? "locked" : "unlocked"} successfully`)
  );
});

const getMyEvents = asyncHandler(async(req,res)=>{
  const events = await Event.find({members: req.user._id})
            .populate("creator","username fullName avatar")
            .sort({createdAt:-1});

  return res.status(200).json(
    new ApiResponse(200,events,"User events fetched successfully")
  );
});

export {
    createEvent,
    requestToJoin,
    getPendingRequests,
    approveJoinRequest,
    rejectJoinRequest,
    removeMember,
    toggleEventLock,
    getMyEvents
};