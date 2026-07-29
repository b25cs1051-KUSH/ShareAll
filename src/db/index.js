import mongoose from "mongoose";
import dns from "node:dns";

// Force Node.js to use Google Public DNS to resolve MongoDB Atlas SRV records
    dns.setServers(["8.8.8.8", "8.8.4.4"]);

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(process.env.MONGODB_URI,{
            dbName: process.env.DB_NAME // Passes database name cleanly without string manipulation
        });

    console.log(`\n 🟢 MongoDB connected! DB HOST: ${connectionInstance.connection.host}`);
  }catch (error) {
        console.error("🔴 MONGODB connection error: ", error);
        process.exit(1);
    }
  
}

export default connectDB;