import mongoose from 'mongoose';

// Register once per module, never print driver errors: they may contain secrets.
mongoose.connection.on('error', () => {
  console.error('MongoDB connection error. Check Atlas access and network connectivity.');
});
mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB connection closed or lost.');
});

export async function connectDatabase(uri) {
  try {
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }
    if (mongoose.connection.readyState === 2) {
      await mongoose.connection.asPromise();
    } else {
      // Await the connection before allowing startup to continue.
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000 });
    }
    console.log('MongoDB connected successfully.');
    return mongoose.connection;
  } catch (error) {
    console.error('MongoDB connection failed. Check credentials, Atlas IP access, and the network.');
    throw error;
  }
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
