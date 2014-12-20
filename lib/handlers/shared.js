var isAuthenticated = function (socket, sessionStore) {
    if (sessionStore.sessions[socket.handshake.sessionID] == null) {
        return false;
    }
    if (sessionStore.sessions[socket.handshake.sessionID].userName == null) {
        return false;
    }
    return true;
};

/**
 * Emit the standard error message across the SocketIO connection
 */
var emitError = function (event, err, socket) {
    if (Array.isArray(socket)) {
        for (var i = 0; i < socket.length; i++) {
            socket[i].emit("data", {
                event: event,
                ok: false,
                isError: true,
                error: err
            });
        }
    } else {
        socket.emit("data", {
            event: event,
            ok: false,
            isError: true,
            error: err
        });
    }
};

/**
 * Emit the standard message across the SocketIO connection
 */
var emitMessage = function (event, message, socket) {
    // Add event
    message.event = event;
    // Emit
    socket.emit("data", message);
};

/**
 * Locate a specific connection by it's session id of all connections available
 */
var locateConnectionWithSession = function (io, sid) {
    var clients = io.sockets.clients();

    // Locate our session id
    for (var i = 0; i < clients.length; i++) {
        if (clients[i].handshake.sessionID == sid) {
            return clients[i];
        }
    }

    return null;
};

/**
 * Emit a message to all clients minus the excluded session id connection
 */
var emitMessageAll = function (io, event, message, excludeSid) {
    var clients = io.sockets.clients();

    // Locate our session id
    for (var i = 0; i < clients.length; i++) {
        if (clients[i].handshake.sessionID != excludeSid) {
            emitMessage(event, message, clients[i]);
        }
    }
};

exports.isAuthenticated = isAuthenticated;
exports.emitError = emitError;
exports.emitMessage = emitMessage;
exports.locateConnectionWithSession = locateConnectionWithSession;
exports.emitMessageAll = emitMessageAll;
