import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/Apiresponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


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

  if([fullName,email,username,password].some((field)=> field?.trim() === "")) {
    throw new ApiError(400,"all fieldss are required.");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, {email}]
  });
  if(existedUser){
    throw new ApiError(409,"User already exists with given username or email..");
  }

  const user = await User.create({
    fullName,
    email: email.toLowerCase(),
    username:username.toLowerCase(),
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

  if(!(username||email)){
    throw new ApiError(400,"Username or email is required");
  }

  const user = await User.findOne({
    $or : [{username},{email}]
  });

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


export {
        registerUser,
        loginUser
    };