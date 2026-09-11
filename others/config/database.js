const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  const localFallbackUri = process.env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27017/innovatesphere';

  // 1. Try remote MongoDB Atlas if provided
  if (uri && uri.startsWith('mongodb')) {
    try {
      const conn = await mongoose.connect(uri, {
        maxPoolSize: 50,
        minPoolSize: 5,
        maxIdleTimeMS: 60000,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 3500, // Quick failover if IP not whitelisted on mobile/WiFi
        family: 4
      });
      console.log(`✅ MongoDB Connected to Atlas: ${conn.connection.host}/${conn.connection.name}`);
      return conn;
    } catch (error) {
      console.warn(`⚠️ MongoDB Atlas unreachable (${error.message}). Falling back to local MongoDB: ${localFallbackUri}`);
    }
  }

  // 2. Fallback to Local MongoDB (innovatesphere)
  try {
    const localConn = await mongoose.connect(localFallbackUri, {
      serverSelectionTimeoutMS: 4000,
    });
    console.log(`✅ Local MongoDB Connected: ${localConn.connection.host}/${localConn.connection.name}`);
    return localConn;
  } catch (localErr) {
    // 3. Last-resort fallback to standard localhost
    try {
      const backupConn = await mongoose.connect('mongodb://localhost:27017/innovatesphere', {
        serverSelectionTimeoutMS: 3000,
      });
      console.log(`✅ Backup Local MongoDB Connected: ${backupConn.connection.host}/${backupConn.connection.name}`);
      return backupConn;
    } catch (finalErr) {
      console.error(`❌ All MongoDB connections failed: ${finalErr.message}`);
    }
  }
};

module.exports = connectDB;

