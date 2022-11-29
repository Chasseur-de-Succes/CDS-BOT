const mongoose = require('mongoose');
// const { DBCONNECTION } = require('../config');

module.exports = {
    init: async () => {
        const mongOptions = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true,
            useFindAndModify: false,
            autoIndex: false, // Don't build indexes
            poolSize: 10, // Maintain up to 10 socket connections
            serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
            family: 4 // Use IPv4, skip trying IPv6
        }

        try {
            mongoose.Promise = global.Promise;
            await mongoose.connect(process.env.DBCONNECTION, mongOptions)
            logger.info({prefix:"[DB]", message:"Mongoose connected!"})
            // await mongoose.connect('mongodb://localhost:27017/test');
            //mongoose.connection.on("connected", () => logger.info({prefix:"[DB]", message:"Mongoose connected!"}));
          } catch (error) {
            console.log('ERROR DB CONNECT :');
            console.log(error);
          }
        //mongoose.connection.on("connected", () => logger.info("\x1b[35m[DB]\x1b[0m Mongoose connected!"))
    }
}
