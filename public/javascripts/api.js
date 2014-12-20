/**
 * Wraps the API used for the game and handles the socketIO connection
 */
var API = function () {
    var self = this;

    this.socket = io.connect("http://" + document.domain);
    this.handlers = {};
    this.onceHandlers = {};

    // Handle the data returned over the SocketIO
    this.socket.on("data", function (data) {

        // If the data object has an event member we have
        // a valid event message from the server
        if (data && data.event) {
            var handlers = self.handlers[data.event];
            if (handlers != null) {
                for (var i = 0; i < handlers.length; i++) {
                    data.isError ? handlers[i](data) : handlers[i](null, data.result);
                }
            }

            var handlers = self.onceHandlers[data.event];
            if (handlers != null) {
                while (handlers.length > 0) {
                    data.isError ? handlers.pop()(data) : handlers.pop()(null, data.result);
                }

                delete self.onceHandlers[data.event];
            }
        }
    });
}

/**
 * Register an event listener callback (will keep receiving messages)
 */
API.prototype.on = function (event, callback) {
    if (this.handlers[event] == null)
        this.handlers[event] = [];
    this.handlers[event].push(callback);
}

/**
 * Register an event listener callback for a single instance of the event
 */
API.prototype.once = function (event, callback) {
    if (this.onceHandlers[event] == null)
        this.onceHandlers[event] = [];
    this.onceHandlers[event].push(callback);
}

/**
 * Register a new user
 */
API.prototype.register = function (fullName, userName, password, callback) {
    // Do basic validation
    if (fullName == null || fullName.length == 0)
        return callback(createError("register", "Full name cannot be empty"));
    if (userName == null || userName.length == 0)
        return callback(createError("register", "User name cannot be empty"));
    if (password == null || password.length == 0)
        return callback(createError("register", "Password name cannot be empty"));
    // Register callback
    this.once("register", callback);
    // Fire message
    this.socket.emit("register", {
        fullName: fullName
        , userName: userName
        , password: password
    });
}

/**
 * Login a user
 */
API.prototype.login = function (userName, password, callback) {
    // Do basic validation
    if (userName == null || userName.length == 0)
        return callback(createError("login", "User name cannot be empty"));
    if (password == null || password.length == 0)
        return callback(createError("login", "Password name cannot be empty"));
    // Register callback
    this.once("login", callback);
    // Fire message
    this.socket.emit("login", {
        userName: userName
        , password: password
    });
}

/**
 * Find all available gamers that are active
 */
API.prototype.findAllAvailableGamers = function (callback) {
    this.once("findAllAvailableGamers", callback);
    this.socket.emit("findAllAvailableGamers", {});
}

/**
 * Invite a gamer to a new game
 */
API.prototype.inviteGamer = function (gamer, callback) {
    this.once("inviteGamer", callback);
    this.socket.emit("inviteGamer", gamer);
}

/**
 * Decline an invite to play a game
 */
API.prototype.declineGame = function (invite, callback) {
    this.once("declineGame", callback);
    this.socket.emit("declineGame", invite);
}

/**
 * Accept an invite to play a game
 */
API.prototype.acceptGame = function (invite, callback) {
    this.once("acceptGame", callback);
    this.socket.emit("acceptGame", invite);
}

/**
 * Place a marker on a specific game at a specific location
 */
API.prototype.placeMarker = function (gameId, x, y, callback) {
    this.once("placeMarker", callback);
    this.socket.emit("placeMarker", {
        gameId: gameId
        , x: x
        , y: y
    });
}

/**
 * Send a message to a specific gamer on a specific game
 */
API.prototype.sendMessage = function (gameId, message, callback) {
    this.once("sendMessage", callback);
    this.socket.emit("sendMessage", {gameId: gameId, message: message});
}

/**
 * Simple method to create a formated error message that fits the
 * format returned from the server
 */
var createError = function (event, err) {
    return {
        event: event
        , ok: false
        , isError: true
        , error: err
    }
}
