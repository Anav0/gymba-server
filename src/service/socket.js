export const initializeSocket = (http) => {
    console.log("Initializing sockets...")
    var io = require('socket.io')(http);

    io.on('connection', function (socket) {
        console.log('a user connected');

        socket.on('private message', function (message) {
            console.log(message);
        });


    });

    console.log("Done!")
}

