import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/Apiresponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { Event } from "../models/event.models.js";
import { Media } from "../models/media.models.js";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";

const uploadMedia = asyncHandler(async(req,res)=>{
  const { eventId } = req.params;
  const { takenAt } = req.body;

  if(!mongoose.Types.ObjectId.isValid(eventId)){
    throw new ApiError(400,"Invalid Event ID format");
  }

  const event = await Event.findById(eventId);
  if (!event){
    throw new ApiError(404,"Event not found");
  }

  if(event.isLocked){
    throw new ApiError(403, "Event is locked by creator. Uploads disabled.");
  }

  const isMember = event.members.some((id)=>id.toString() === req.user._id.toString());
  if(!isMember){
    throw new ApiError(403,"Only approved members can add photos");
  }
  
  const localFilePath = req.file?.path;

  if (!localFilePath) {
      throw new ApiError(400, "No photo file provided");
  }

  const cloudinaryResponse = await uploadOnCloudinary(localFilePath);

  if (!cloudinaryResponse) {
      throw new ApiError(500, "Failed to upload photo to cloud storage");
  }

  const media = await Media.create({
     event: eventId,
      uploader: req.user._id,
      url: cloudinaryResponse.secure_url,
      publicId: cloudinaryResponse.public_id,
      mimeType: req.file.mimetype || "image/jpeg",
      sizeBytes: cloudinaryResponse.bytes || req.file.size,
      takenAt: takenAt ? new Date(takenAt) : Date.now(),
      taggedUsers: []
  });

  return res.status(201).json(
    new ApiResponse(201,media,"Photo uploaded successfully")
  );
});

const getEventMedia = asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const { page = 1, limit = 20, startDate, endDate } = req.query;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
        throw new ApiError(400, "Invalid Event ID format");
    }

    const event = await Event.findById(eventId);

    if (!event) {
        throw new ApiError(404, "Event not found");
    }

    const isMember = event.members.some((id) => id.toString() === req.user._id.toString());
    if (!isMember) {
        throw new ApiError(403, "Only approved members can view event photos");
    }

    const query = { event: eventId };
    
    if (startDate || endDate) {
        query.takenAt = {};
        if (startDate) query.takenAt.$gte = new Date(startDate);
        if (endDate) query.takenAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const mediaList = await Media.find(query)
        .populate("uploader", "username fullName avatar")
        .populate("taggedUsers", "username fullName avatar")
        .sort({ takenAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

     const totalMedia = await Media.countDocuments(query);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                media: mediaList,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalMedia,
                    totalPages: Math.ceil(totalMedia / limit)
                }
            },
            "Event gallery media fetched successfully"
        )
    );
});

const deleteMedia = asyncHandler(async (req, res) => {
    const { mediaId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(mediaId)) {
        throw new ApiError(400, "Invalid Media ID format");
    }

    const media = await Media.findById(mediaId);

    if (!media) {
        throw new ApiError(404, "Media not found");
    }

    const event = await Event.findById(media.event);

   
    const isUploader = media.uploader.toString() === req.user._id.toString();
    const isCreator = event && event.creator.toString() === req.user._id.toString();

    if (!isUploader && !isCreator) {
        throw new ApiError(403, "Only the photo uploader or event creator can delete this photo");
    }

    
    if (media.publicId) {
        await cloudinary.uploader.destroy(media.publicId);
    }

    // Delete document from MongoDB
    await Media.findByIdAndDelete(mediaId);

    return res.status(200).json(
        new ApiResponse(200, null, "Photo deleted successfully")
    );
});

export{
  uploadMedia,
  uploadOnCloudinary,
  deleteMedia,
  getEventMedia
};