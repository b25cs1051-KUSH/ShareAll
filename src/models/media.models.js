import mongoose,{Schema} from "mongoose";

const mediaSchema = new Schema(
  {
    event:{
      type:Schema.Types.ObjectId,
      ref:"Event",
      required:true,
      index:true
    },
    uploader:{
      type:Schema.Types.ObjectId,
      ref:"User",
      required:true,
      index:true
    },
    url:{
        type:String,
        required:true
      },
    publicId:{
      type:String,
      required:true
    },
    mimeType:{
      type:String,
      default:"image/jpeg"
    },
    sizeBytes:{
      type:Number,
      required:true
    },
    takenAt:{
      type:Date,
      default:Date.now
    },
    taggedUsers:[
      {
        type:Schema.Types.ObjectId,
        ref:"User"
      }
    ]
  },
  {
    timestamps:true
  }
);

export const Media = mongoose.model("Media",mediaSchema)