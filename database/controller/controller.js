const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URI;

const client = new MongoClient(uri,
  { useUnifiedTopology: true},
  { useNewUrlParser: true },
  { connectTimeoutMS: 3000 },
  { keepAlive: 1}
);

// Creates a session if the rendered room ID is a new one and not found in the database.
exports.createSession = async function(roomId) {
  try {
    if (roomId == 'favicon.ico') {
      console.log('Favicon...');
    } else if (roomId == 'robots.txt') {
      console.log('Robots...');
    } else {
      await client.connect();
      const database = client.db("rtctele");
      const sessions = database.collection("sessions");
      let operation = await sessions.findOne(
        {
          room: roomId
        }, (err, result) => {
          if (err) {
            throw err
          }
          else if (result == undefined) {
            insertSession(roomId);
          }
          else {
            console.log('Room already exists');
          }
        }
      );
    };
  } catch (err) {
    throw err
  }
};

// Helper function for inserting a new session
async function insertSession(roomId) {
  try {
    await client.connect();
    const database = client.db("rtctele");
    const sessions = database.collection("sessions");

    let dateNow = new Date();
    let obj = { room: roomId,
              url: `https://rtctele.herokuapp.com/${roomId}`,
              users: [],
              status: 'New',
              date: dateNow };

    let operation = await sessions.insertOne(
      obj, (err, result) => {
        if (err) {
          throw err
        }

        else if (result) {
          console.log('Inserted!');
        }
      }
    );
  } catch (err) {
    throw err
  }
};

// Adds the user to the database users array.
exports.connectUser = async function(roomId, userId) {
  try {
    console.log("connecting user!")
    await client.connect();
    const database = client.db("rtctele");
    const sessions = database.collection("sessions");
    let filter = { room: roomId };
    let obj = { $push: { users: userId } };
    let operation = await sessions.updateOne(
      filter, obj, (err, result) => {
        if (err) {
          throw err
        }

        else if (result) {
          console.log('Connect success!');
        }
      }
    );
  } catch (err) {
    throw err
  }
};

// Removes the user from the users array in the database.
// If the user was the last user, the session is deleted from the database.
exports.disconnectUser = async function(roomId, userId) {
  try {
    await client.connect();
    const database = client.db("rtctele");
    const sessions = database.collection("sessions");
    let filter = { room: roomId };
    let operation = await sessions.findOne(
      filter, (err, result) => {
        if (err) {
          throw err
        }

        else if (result) {
          if (result.room == roomId) {
            if (result.users.length > 1) {
              remUser(roomId, userId);
            } else {
              delSession(roomId);
            }
          }
        }
      }
    );
  } catch (err) {
    throw err
  }
};

// Helper function for deleting a session.
async function delSession(roomId) {
  try {
    await client.connect();
    const database = client.db('rtctele');
    const sessions = database.collection("sessions");
    let filter = { room: roomId };
    let operation = await sessions.deleteOne(
      filter, (err, result) => {
        if (err) {
          throw err
        }

        else if (result) {
          console.log("Deleted the session!");
        }
      }
    );
  } catch (err) {
    throw err
  }
};

// Helper function for removing a user.
async function remUser(roomId, userId) {
  try {
    await client.connect();
    const database = client.db("rtctele");
    const sessions = database.collection("sessions");
    let filter = { room: roomId };
    let obj = { $pull: { users: userId } };
    let operation = await sessions.updateOne(
      filter, obj, (err, result) => {
        if (err) {
          throw err
        }

        else if (result) {
          console.log("Disconnected a user!");
        }
      }
    );
  } catch (err) {
    throw err;
  }
};

// Checks the status of the sessions
exports.checkSession = async function(roomId, userId) {
  try {
    console.log('checking session...!')
    await client.connect();
    const database = client.db("rtctele");
    const sessions = database.collection("sessions");
    let filter = { room: roomId };
    let operation = await sessions.findOne(
      filter, (err, result) => {
        if (err) {
          throw err
        }

        else if (result) {
          if (result.room == roomId) {
            if (result.users.length >= 1) {
              let statusType = "In Progress";
              updateSession(roomId, statusType);
            }
          }
        }
      }
    );
  } catch (err) {
    throw err
  }
};

async function updateSession(roomId, statusType) {
  try {
    await client.connect();
    const database = client.db("rtctele");
    const sessions = database.collection("sessions");
    let filter = { room: roomId };
    let obj = { $set: { status: statusType } };
    let operation = await sessions.updateOne(
      filter, obj, (err, result) => {
        if (err) {
          throw err
        }

        else if (result) {
          console.log("Status updated to " + statusType + ": " + roomId);
        }
      }
    );
  } catch (err) {
    throw err
  }
};

//Returns a JSON object of all available rooms that are not complete.
exports.getSessionList = async function(req, res) {
  try {
    await client.connect();
    const database = client.db("rtctele");
    const sessions = database.collection("sessions");

    var startDate = new Date();

    startDate.setSeconds(0);
    startDate.setHours(0);
    startDate.setMinutes(0);

    var dateMidnight = new Date(startDate);
    dateMidnight.setHours(23);
    dateMidnight.setMinutes(59);
    dateMidnight.setSeconds(59);

    let filter = {
      status: {
        $in: ["New"]
      },
      date : {
        $gte: startDate,
        $lte: dateMidnight
      }
    };
    let obj = {
      _id: 0,
      room: 1,
      url: 1,
      users: 1,
      status: 1,
      date: 1
    };

    const data = await sessions.find(filter, obj).toArray();

    if (data.length == 0) {
      console.log("No documents found.");
    } else {
      res.json(data);
    };

  } catch (err) {
    throw err
  } finally {
    await client.close();
  }
};
