import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.warn('⚠️ [DB WARNING] MONGO_URI is not set in environment variables! Trying local fallback...');
    }

    const conn = await mongoose.connect(mongoUri || 'mongodb://127.0.0.1:27017/mern_auth_db', {
      serverSelectionTimeoutMS: 8000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);

    // Ensure email and phone indexes are sparse to allow phone-only or email-only users
    try {
      const usersCollection = conn.connection.collection('users');
      const indexes = await usersCollection.indexes();
      const emailIndex = indexes.find(idx => idx.name === 'email_1');
      if (emailIndex && !emailIndex.sparse) {
        console.log('🔄 Updating users email_1 index to sparse: true...');
        await usersCollection.dropIndex('email_1');
        await usersCollection.createIndex({ email: 1 }, { unique: true, sparse: true });
        console.log('✅ email_1 index updated to sparse: true');
      }
      const phoneIndex = indexes.find(idx => idx.name === 'phone_1');
      if (!phoneIndex) {
        await usersCollection.createIndex({ phone: 1 }, { unique: true, sparse: true });
      }
    } catch (idxErr) {
      console.warn('Index sync note:', idxErr.message);
    }
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error('💡 If deployed on Render:');
    console.error('   1. Ensure MONGO_URI is added in your Render Dashboard -> Environment tab.');
    console.error('   2. Ensure MongoDB Atlas -> Network Access has 0.0.0.0/0 (Allow access from anywhere).');
  }
};
