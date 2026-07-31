import { app } from "../app.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/Apiresponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";


const generateAccessAndRefreshTokens = async(userId)=>{
  try{
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken,refreshToken };
  }catch (error){
    throw new ApiError(500,"Something went wrong while generating tokens");
  }
};

const registerUser = asyncHandler(async (req,res)=>{
  const {fullName,email,username,password} = req.body;
  //security feature
  if(typeof fullName !== "string" || typeof email !== "string" || typeof username !== "string" || typeof password !== "string"){
    throw new ApiError(400,"Invalid data type");
  }

  if([fullName,email,username,password].some((field)=> field?.trim() === "")) {
    throw new ApiError(400,"all fieldss are required.");
  }

  const existedUser = await User.findOne({
    $or: [{ username: username.toLowerCase() }, {email: email.toLowerCase() }]
  });

  if(existedUser){
    throw new ApiError(409,"User already exists with given username or email..");
  }

  const user = await User.create({
    fullName: fullName.trim(),
    email: email.toLowerCase().trim(),
    username:username.toLowerCase().trim(),
    password
  });

  const createdUser = await User.findById(user._id).select("-password -refreshToken");

  if(!createdUser){
    throw new ApiError(500,"Something went wrong while registering the user server side error");
  }

  return res.status(201).json(
    new ApiResponse(201 , createdUser , "user successfully registered")
  );
});



const loginUser = asyncHandler(async(req,res) =>{
  const{email,username,password} = req.body;

  if(!password || (typeof password!== "string")){
    throw new ApiError(400,"Password is required");
  }
 
  if(!(username||email)){
    throw new ApiError(400,"Username or email is required");
  }
  
  const searchQuery = {};
    if (email && typeof email === "string") searchQuery.email = email.toLowerCase().trim();
    if (username && typeof username === "string") searchQuery.username = username.toLowerCase().trim();


  const user = await User.findOne(searchQuery);

  if(!user){
    throw new ApiError(404,"user do not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if(!isPasswordValid){
    throw new ApiError(401,"invalid password");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  const options={
    httpOnly:true, // Prevents client-side JS from reading cookie (XSS protection)
    secure:true  // Transmitted over HTTPS only
  }

  return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
          new ApiResponse(
            200,
            {
              user:loggedInUser,
              accessToken,
              refreshToken
            },
            "User logged in successsfully"
          )
        );
});

const logoutUser = asyncHandler(async(req,res)=>{
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset:{
        refreshToken:1
      }
    },
    {new:true}
  );
  const options ={
    httpOnly:true,
    secure:true
  };

  return res
      .status(200)
      .clearCookie("accessToken",options)
      .clearCookie("refreshToken",options)
      .json(new ApiResponse(200,{},"User logged out successfully"));
});


const refreshAccessToken = asyncHandler(async (req,res)=>{
  const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if(!incomingRefreshToken){
    throw new ApiError(401,"UUnauthorized request.refresh token missing");
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id);

    if(!user){
      throw new ApiError(401,"Invalid refresh token..")
    }

    if(incomingRefreshToken !== user.refreshToken){
      throw new ApiError(401,"Refresh token is expired or used");
    }

    const options={
      httpOnly:true,
      secure:true
    };

    const { accessToken,newRefreshToken} = await generateAccessAndRefreshTokens(user._id);

    return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
          new ApiResponse(
            200,
            {accessToken, refreshToken:newRefreshToken},
            "Acccess Token Refreshed successfully"
          )
        );
  }catch(error){
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
})
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
};