const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, '..', 'public')));

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('drawing', (data) => {
    socket.broadcast.emit('drawing', data);
  });

  socket.on('erasing', (data) => {
    socket.broadcast.emit('erasing', data);
  });

  socket.on('mousemove', (data) => {
    socket.broadcast.emit('mousemove', data);
  });

  socket.on('clear', () => {
    socket.broadcast.emit('clear');
  });

  socket.on('stoppedDrawing', (data) => {
    socket.broadcast.emit('stoppedDrawing', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
