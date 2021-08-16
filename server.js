const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { v4: uuidV4 } = require('uuid');
const controller = require("./database/controller/controller");

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.redirect(`/${uuidV4()}`)
})

app.get('/:room', (req, res) => {
  var room_id = req.params.room
  res.render('room', { roomId: room_id })
  controller.createSession(room_id)
})

app.get('/api/list', (req, res) => {
  controller.getSessionList(req, res)
})

io.on('connection', socket => {
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId)
    socket.broadcast.to(roomId).emit('user-connected', userId)
    try {
      console.log('connected!')
      controller.connectUser(roomId, userId)
    } finally {
      console.log('updated!')
      controller.checkSession(roomId, userId)
    }

    socket.on('disconnect', () => {
        socket.broadcast.to(roomId).emit('user-disconnected', userId)
        console.log('disconnected!')
        controller.disconnectUser(roomId, userId)
    })
  })
})

server.listen(process.env.PORT||5000);
console.log('Started...')
