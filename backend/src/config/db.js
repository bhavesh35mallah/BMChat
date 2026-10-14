import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mern_auth_db');
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
    process.exit(1);
  }
};
