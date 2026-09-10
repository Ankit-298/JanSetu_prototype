const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  try {
    const conn = await mongoose.connect(uri, {
      maxPoolSize: 50,
      minPoolSize: 10,
      maxIdleTimeMS: 60000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 15000,
      family: 4
    });
    console.log(`✅ MongoDB Connected to Atlas: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.warn(`⚠️ MongoDB Atlas unreachable (${error.message}). Connecting to local MongoDB: mongodb://localhost:27017/test`);
    try {
      const localConn = await mongoose.connect('mongodb://localhost:27017/test', {
        serverSelectionTimeoutMS: 3000,
      });
      console.log(`✅ Local MongoDB Connected: ${localConn.connection.host}/${localConn.connection.name}`);
      return localConn;
    } catch (localErr) {
      console.error(`❌ Local MongoDB connection failed: ${localErr.message}`);
    }
  }
};

module.exports = connectDB;
