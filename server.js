const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { v4: uuidV4 } = require('uuid');
const controller = require("./database/controller/controller");

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/', (req, res) => {
  const room = uuidV4();
  res.redirect(`/${room}`);
  controller.createSession(room);
});

app.get('/:room', (req, res) => {
  res.render('room', { roomId: req.params.room });
});

app.get('/api/list', (req, res) => {
  controller.getSessionList(req, res);
});

io.on('connection', socket => {
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    controller.connectUser(roomId, userId);
    controller.checkSession(roomId, userId);
    socket.broadcast.to(roomId).emit('user-connected', userId);

    socket.on('disconnect', () => {
      controller.disconnectUser(roomId, userId);
      socket.broadcast.to(roomId).emit('user-disconnected', userId);
    });
  });
});

server.listen(process.env.PORT||3000);
console.log('Started...');
