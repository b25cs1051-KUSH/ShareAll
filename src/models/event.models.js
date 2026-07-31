import mongoose,{Schema} from "mongoose";

const eventSchema = new Schema(
  {
    name:{
      type:String,
      required:[true,"Event name is required"],
      trim:true,
      index:true
    },
    description:{
      type:String,
      trim:true,
      default:""
    },
    coverImage:{
      type:String,
      default:""
    },
    startDate:{
      type:Date,
      default:null
    },
    endDate:{
      type:Date,
      default:null
    },
    inviteCode:{
      type:String,
      required:true,
      unique:true,
      uppercase:true,
      trim:true,
      index:true
    },
    creator:{
      type: Schema.Types.ObjectId,
      ref:"User",
      required:true
    },
    admins: [
      {
        type:Schema.Types.ObjectId,
        ref:"User"
      }
    ],
    members:[
      {
       type:Schema.Types.ObjectId,
       ref:"User" 
      }
    ],
    pendingRequests:[
      {
        type:Schema.Types.ObjectId,
        ref:"User"
      }
    ],
    isLocked:{
      type:Boolean,
      default:false
    }
  },
  {
    timestamps:true
  }
);

export const Event = mongoose.model("Event",eventSchema);