export const initializeSocket = (http) => {
    console.log("Initializing sockets...")
    var io = require('socket.io')(http);

    io.on('connection', (socket) => {
        console.log('a user connected');

        socket.on('join', (room) => {
            socket.join(room);
        });

        socket.on('private message', (message) => {
            console.log(message);
        });


    });

    console.log("Done!")
}

