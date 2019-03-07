var app = require("express")();
var cors = require("cors");
var server = require("http").Server(app);
var io = require("socket.io")(server);
app.use(cors());
server.listen(3000);

// app.get("/", function(req, res) {
//   res.sendFile(__dirname + "/index.html");
// });

var rooms = [
  { id: "0", name: "Default", clients: [], messages: [] },
  { id: "1", name: "Green", clients: [], messages: [] },
  { id: "2", name: "Blue", clients: [], messages: [] }
];

io.on("connection", socket => {
  //Update list of connected clients
  var clients = getConnectedClientsInfo();

  //When client connects, inform others about it
  io.emit("list of connected clients", clients);

  //When client connects, inform him about rooms
  io.emit("list of rooms", rooms);

  //When client updates his username
  socket.on("new username", client => {
    console.log(socket.id);
    console.log(client.d);
    // io.emit("update client data", client);

    // Change sender username in existing messages

    // io.emit("all messages", allMessages);
  });

  //When client sends message
  socket.on("send message", data => {
    data.room.messages.push(data.message);
    io.emit("recived message", data.message);
  });

  //When client gets disconnected
  socket.on("disconnect", () => {
    clients.splice(
      client =>
        client.findIndex(i => {
          return i.id === socket.id;
        }),
      1
    );
    io.emit("list of connected clients", clients);
  });

  //When client wants to connect to a room
  socket.on("join room", data => {
    const room = rooms.find(room => room.id == data.roomId);

    if (room.clients.find(x => x.id == socket.id)) return;

    socket.leaveAll();

    socket.join(room.name);

    room.clients.push({ username: socket.username, id: socket.id });

    console.log(room);

    socket.to(room.name).emit("all messages", room.messages);
    io.emit("list of rooms", rooms);
  });

  //When client wants to leave a room
  socket.on("leave room", roomId => {
    const room = rooms.find(room => room.id == roomId)[0];
    socket.leave(room.name);

    room.clients = room.clients.filter(x => x.id != data.client.id);
    io.to(room.name).emit("list of connected clients", room.clients);
    console.log(room);
  });
});

function getConnectedClientsInfo() {
  var clients = [];
  for (socketId in io.sockets.sockets) {
    var client = io.sockets.sockets[socketId];
    clients.push({ username: client.username, id: client.id });
  }
  return clients;
}
