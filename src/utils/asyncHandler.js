//higher order function to avoid writting try-catch again and again
//datbase is in the different continent and it can give many errors...


const asyncHandler = (requestHandler)=>{
  return (req,res,next)=>{
    Promise.resolve(requestHandler(req,res,next))
        .catch((err) => next(err));
  }
}

export {asyncHandler};