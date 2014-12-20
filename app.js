var env                    = require('./env'),
    registerHandler        = require('./lib/handlers/loginHandler').registerHandler,
    loginHandler           = require('./lib/handlers/loginHandler').loginHandler,
    findAllAvailableGamers = require('./lib/handlers/gamerHandler').findAllAvailableGamers,
    inviteGamer            = require('./lib/handlers/gamerHandler').inviteGamer,
    declineGame            = require('./lib/handlers/gamerHandler').declineGame,
    acceptGame             = require('./lib/handlers/gamerHandler').acceptGame,
    placeMarker            = require('./lib/handlers/gamerHandler').placeMarker,
    sendMessage            = require('./lib/handlers/chatHandler').sendMessage,
    mainController         = require('./lib/controllers/mainController');

env.initialize(function(err, app, io, sessionStore, db) {
    if (err) {
        throw err;
    }

    /**
     * routes
     */
    app.get('/', mainController.index());

    /**
     * websocket api end point handlers (our API)
     */
    io.sockets.on('connection', function (socket) {
        socket.on('register', registerHandler(io, socket, sessionStore, db));
        socket.on('login', loginHandler(io, socket, sessionStore, db));
        socket.on('findAllAvailableGamers', findAllAvailableGamers(io, socket, sessionStore, db));  
        socket.on('inviteGamer', inviteGamer(io, socket, sessionStore, db));
        socket.on('declineGame', declineGame(io, socket, sessionStore, db));
        socket.on('acceptGame', acceptGame(io, socket, sessionStore, db));
        socket.on('placeMarker', placeMarker(io, socket, sessionStore, db));
        socket.on('sendMessage', sendMessage(io, socket, sessionStore, db));

        // Fire the init message to setup the game
        socket.emit('data', {event:'init', ok:true, result: socket.handshake.sessionID});
    });

    /**
     * fire up the server
     */
    env.run(function (err) {
        if (err) {
            throw err;
        }
        // nothing to do
    });
});