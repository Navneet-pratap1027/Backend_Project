import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.models.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";

const generateAccessAndRefreshTokens = async(userId)=> {
   try{
      const user = await User.findById(userId)
      const accessToken = user.generateAccessToken()
      const refreshToken = user.generateRefreshToken()

      user.refreshToken = refreshToken // Set the new refresh token on the user object (not saved yet)
      await user.save({validateBeforeSave: false})

      return {accessToken, refreshToken}

   }catch(error){
      throw new ApiError(500,"Something went wrong while generating refresh and acces token")

   }
}

const registerUser = asyncHandler(async (req, res)=> {
   const {fullname,email,username,password} = req.body
   if (
      [fullname,email,username,password].some((field)=>
      field?.trim()==="")
   )  {
         throw new ApiError(400,"All filed is required")
      }
      // console.log(req.files);
     const existedUser= await User.findOne({
      $or:[{username},{email}]
      })
      if (existedUser){
         throw new ApiError(409,"User with this email or username already exists ")
      }

const avatarLocalPath = req.files?.avatar[0]?.path;
const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
/*
if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
   coverImageLocalPath = req.files.coverImage[0].path
}
*/

if (!avatarLocalPath){
   throw new ApiError(400, "Avatar is required")
}

const avatar = await uploadOnCloudinary(avatarLocalPath)
const coverImage = await uploadOnCloudinary(coverImageLocalPath)

if (!avatar){
   throw new ApiError(400, "Avatar is required")
}

const user= await User.create({
   fullname,
   avatar:avatar.url,
   coverImage:coverImage?.url || "",
   email,
   password,
   username:username.toLowerCase()
  })
  const createdUser = await User.findById(user._id).select("-password -refreshToken")
  if(!createdUser){
   throw new ApiError(500, "Something went wrong during registering User")
  }

  return res.status(201).json(
   new ApiResponse(200,createdUser, "User registerd Successfull")
  )
})
   // if(fullname===""){
   //    throw new ApiError(400,"fullname is required")
   // }
  
// const requiredFields = ["fullname", "email", "password"];
// requiredFields.forEach(field => {
//   if (!req.body[field] || req.body[field].trim() === "") {
//     throw new ApiError(400, `${field} is required`);
//   }
// });


const loginUser = asyncHandler(async(req,res) => {
   const {email, username, password} = req.body;

   if(!(username || email) ){
      throw new ApiError(400, "username or email  is required")
   }
   if (!password || password.trim()===""){
      throw new ApiError(400, "Password is required")

   }

   const user =await User.findOne({
      $or:[{email}, {username}]
   })

   if(!user){
      throw new ApiError(404,"User does not exist")
   }

  const isPasswordValid = await user.isPasswordCorrect(password)
  if(!isPasswordValid){
      throw new ApiError(401,"Password is incorrect")
   }

  const {accessToken, refreshToken}= await generateAccessAndRefreshTokens(user._id)

//   const tokens = await generateAccessAndRefreshTokens(user._id)
//   const accessToken = tokens.accessToken
//   const refreshToken = tokens.refreshToken


  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

  const options={
   httpOnly:true,
   secure:true,
   sameSite: "none"
  }
  return res
  .status(200)
  .cookie("accessToken", accessToken,options)
  .cookie("refreshToken", refreshToken,options)
  .json(
   new ApiResponse(
      200,
      {
         user:loggedInUser, accessToken,
         refreshToken
      },
      "User logged In Successfully"
   )
  )

})
export {
   registerUser,
   loginUser
}

/*Step for Register User
1=> Get user from frontend
2=> validation like not empty
3=> check user already exit or not(by username or email)
4=> check for images,check for avatr
5=> upload them cludinary,avtar
6=> create user object - create entry in db
7=> remove password and refresh token field from response
8=> check for user creation 
9=> return response  


Step for loginUser
1=> req body => data
2=>username or email
3=>find the user
4=> password check
5=> genrate acces and refres token
6=> send cookies
7=>send response you are logged in

*/