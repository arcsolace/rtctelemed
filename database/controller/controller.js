const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URI;

const client = new MongoClient(uri);

// Creates a session if the rendered room ID is a new one and not found in the database.
exports.createSession = async function(room_id) {
  try {
    await client.connect();
    const database = client.db("rtctele");
    const sessions = database.collection("sessions");

    let dateNow = new Date()
    const result = await sessions.findOne({ room: room_id })

    if (result == undefined) {
      if (room_id == 'favicon.ico') {
        console.log('Favicon...')
      } else {
        let obj = { room: room_id,
                  url: `https://rtctele.herokuapp.com/${room_id}`,
                  users: [],
                  status: 'New',
                  date: dateNow }
        const insert = await sessions.insertOne(obj)
        console.log(insert)
      }
    }
  } catch (err) {
    throw err
  } finally {
    await client.close()
  }
}

// Adds the user to the database users array.
exports.connectUser = async function(roomId, userId) {
  try {
    await client.connect();
    const database = client.db("rtctele");
    const sessions = database.collection("sessions");

    const result = await sessions.findOne({ room: roomId })
    if (result != undefined) {
      let filter = { room: roomId }
      let obj = { $push: { users: userId } };
      const update = await sessions.updateOne(filter, obj)
      console.log(update)
    }
  } catch (err) {
    throw err
  } finally {
    await client.close()
  }
}

// Removes the user from the users array in the database.
// If the user was the last user, the session is deleted from the database.
exports.disconnectUser = async function(roomId, userId) {
  try {
    await client.connect();
    const database = client.db("rtctele");
    const sessions = database.collection("sessions");
    let filter = { room: roomId }
    const result = await sessions.findOne(filter)
    if (result != undefined) {
      if (result.users.length > 1) {
        let obj = { $pull: { users: userId } }
        const update = await sessions.updateOne(filter, obj)
        console.log(update)
      } else {
        const deleted = await sessions.deleteOne(filter)
        console.log(deleted)
      }
    }
  } catch (err) {
    throw err
  } finally {
    await client.close()
  }
}

// Checks the status of the sessions
exports.checkSession = async function(roomId, userId) {
  try {
    await client.connect();
    const database = client.db("rtctele");
    const sessions = database.collection("sessions");
    let filter = { room: roomId }
    const result = await sessions.find({ room: roomId })
    if (result != undefined) {
      if (result.users.length >= 2) {
        let obj = { $set: { status: "Complete" } }
        const update = await sessions.updateOne(filter, obj)
        console.log(update)
        console.log("Status updated:" + roomId)
      } else if (result.users.length == 1) {
        let obj = { $set: { status: "Started" } }
        const update = await sessions.updateOne(filter, obj)
        console.log(update)
        console.log("Status updated:" + roomId)
      }
    }
  } catch (err) {
    throw err
  } finally {
    await client.close()
  }
}

//Returns a JSON object of all available rooms that are not complete.
exports.getSessionList = async function(req, res) {
  try {
    await client.connect();
    const database = client.db("rtctele");
    const sessions = database.collection("sessions");

    let filter = { status: 'New' }
    let obj = {
      _id: 0,
      room: 1,
      url: 1,
      users: 1,
      status: 1,
      date: 1
    }

    const data = await sessions.find(filter, obj).toArray();
    console.log(data)
    if (data.length == 0) {
      console.log("No documents found.")
    } else {
      res.json(data)
    }
  } finally {
    await client.close()
  }
}
