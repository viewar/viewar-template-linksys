const io = require('socket.io')();
const values = require('object.values');

const rooms = {};

io.on('connection', (socket) => {
  console.log('connected', socket.id);

  socket.on('joinRoom', ({ role, room, name }, callbackId) => {
    if (!rooms[room]) {
      rooms[room] = { name: room, clients: [{ id: socket.id, number: 1, role, name }], totalClientCount: 1 };
    } else {
      rooms[room].totalClientCount += 1;
      rooms[room].clients.push({ id: socket.id, role, name, number: rooms[room].totalClientCount });
    }

    socket.join(room);
    console.log(socket.id, ' joining room: ', rooms[room]);
    socket.broadcast.to(room).emit('clientJoined', getLatestClient(room));

    //callback to sender
    socket.emit(callbackId, { res: rooms[room] });
  });

  socket.on('disconnect', () => {

    console.log(`${socket.id} disconnected`);
    values(rooms)
      .filter(room => room.clients.find(client => client.id === socket.id))
      .forEach((room) => {
        console.log(socket.id, ' leaves room ', room.name)
        socket.broadcast.to(room.name).emit('clientLeft', socket.id);

        // remove client from list
        room.clients = room.clients.filter(({ id }) => id !== socket.id);

        // reset count if all left
        if(!room.clients.length){
          room.totalClientCount = 0;
        }

        socket.leave(room.name);
      });
  });

  socket.on('leaveRoom', ({ room }) => {
    console.log(`${socket.id} leaves room ${room}`);
    socket.leave(room);
  });

  socket.on('setClientData', ({ data, room }) => {
    try{
      const client = rooms[room].clients.find(({ id }) => id === socket.id);
      const remainingClients = rooms[room].clients.filter(({ id }) => id !== socket.id);
      const alteredClient = Object.assign(client, data);
      room.clients = [...remainingClients, alteredClient];
      console.log(socket.id, ' changed client data: ', rooms[room]);
      socket.broadcast.to(room).emit('clientChangedData', alteredClient);
    } catch(e) {
      console.log('could not set Client Data for', socket.id);
    }

  });

  socket.on('getRooms', (callbackId) => {
    socket.emit(callbackId, rooms);
  });

  socket.on('send', ({ room, data, messageType = 'message' }) => {
    socket.broadcast.to(room).emit(messageType, data);
  });

});

io.listen(3001);
console.log('socket server running on ws://localhost:3001');

function getLatestClient(room) {
  return rooms[room].clients[rooms[room].clients.length - 1];
}