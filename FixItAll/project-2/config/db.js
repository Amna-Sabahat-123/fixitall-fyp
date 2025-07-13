const mongoose = require('mongoose');
const config = require('config');
const dbgr = require('debug')('development:mongoose');

mongoose
  .connect(`${config.get('MONGODB_URI')}/FixItAll`)
  .then(() => {
    dbgr('✅ MongoDB connected successfully');
  })
  .catch((err) => {
    dbgr('❌ MongoDB connection failed:', err.message);
  });

module.exports = mongoose.connection;
