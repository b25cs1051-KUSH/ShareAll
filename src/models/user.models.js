import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
   
const userSchema = new Schema(
    {
       username: {
          type: String,
          required: true,
          unique: true,
          lowercase: true,
          trim: true,
          index: true // Makes database search faster
       },
        email: {
           type: String,
           required: true,
            unique: true,
           lowercase: true,
           trim: true
        },
        fullName: {
           type: String,
            required: true,
           trim: true,
           index: true
        },
         avatar: {
            type: String, // Cloudinary or S3 URL
            default: ""
        },
         password: {
            type: String,
            required: [true, 'Password is required']
        },
         refreshToken: {
             type: String
        },
         faceEmbedding: {
            type: [Number], // Array of numbers for 128-d face vector
            default: []
        }
    },
    {
       timestamps: true // Automatically adds createdAt and updatedAt fields
    }
);
    
userSchema.pre("save", async function (next) {
  if(!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password,11);
  next();
});

userSchema.methods.isPasswordCorrect = async function(password){
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken =function(){
  return jwt.sign(
    {
      _id: this._id,
      email:this.email,
      username:this.username
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign({
     _id:this._id
  },
  process.env.REFRESH_TOKEN_SECRET,
  {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY
  }
  );
};

export const User = mongoose.model("User", userSchema);