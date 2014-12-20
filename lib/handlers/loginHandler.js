var emitMessage = require("./shared").emitMessage,
    isAuthenticated = require("./shared").isAuthenticated,
    emitMessageAll = require("./shared").emitMessageAll,
    emitError = require("./shared").emitError;

var user = require('../models/user'),
    gamer = require('../models/gamer');

/**
 * Register a new user
 */
var registerHandler = function (io, socket, sessionStore, db) {
    // Easier to keep track of where we emitting messages
    var callingMethodName = "register";

    // Function we return that accepts the data from SocketIO
    return function (data) {
        // Unpack the parameters
        var fullName = data.fullName,
            userName = data.userName,
            password = data.password;

        // Check if the user already exists
        user(db).findByUser(userName, function (err, _user) {
            // If there is there is an error when attempting to find the user
            if (err) {
                return emitError(callingMethodName, err.message, socket);
            }

            // The user already exists notify the client function
            if (_user != null) {

                return emitError(callingMethodName, "User with user name " + userName + " already exists", socket);
            }

            // The user does not exist, let's create it
            user(db).createUser(fullName, userName, password, function (err, _user) {
                // There was an error during the creation of the user, emit an error message
                // to the calling client
                if (err) {
                    return emitError(callingMethodName, err.message, socket);

                }

                // We have a legal registration, lets set up the state needed
                // and log the user in
                emitLoginOrRegistrationOk(io, callingMethodName, db, sessionStore, userName, socket);
            });
        });
    };
};

/**
 * Attempt to login user
 */
var loginHandler = function (io, socket, sessionStore, db) {
    // Easier to keep track of where we emitting messages
    var callingMethodName = "login";

    // Function we return that accepts the data from SocketIO
    return function (data) {
        // Unpack the parameters
        var userName = data.userName,
            password = data.password;

        // Locate the user by user name and password
        user(db).findByUserAndPassword(userName, password, function (err, user) {
            // If there is there is an error when attempting to find the user      
            if (err) {
                return emitError(callingMethodName, err.message, socket);
            }
            // There was no user returned, meaning the user either does not exist or the
            // password is incorrect
            if (user == null) {
                return emitError(callingMethodName, "User or Password is incorrect", socket);
            }
            // We have a legal login, lets set up the state needed
            // and log the user in
            emitLoginOrRegistrationOk(io, callingMethodName, db, sessionStore, userName, socket);
        });
    }
}

/**
 * Updates the gamer status and sets up the session as being authenticated, finally
 * returns the gamer data to all other clients that are connected signaling a new
 * player is available
 */
var emitLoginOrRegistrationOk = function (io, event, db, sessionStore, userName, socket) {
    // Easier to keep track of where we emitting messages
    var eventName = "gamerJoined";

    // Update the current gamer with the new session id and update the last updated date time
    gamer(db).updateGamer(userName, socket.handshake.sessionID, function (err, result) {
        if (err) {
            return emitError(event, err.message, socket);
        }
        if (result == 0) {
            return emitError(event, "Failed to Save user as active", socket);
        }

        // Set authenticated on the session
        sessionStore.sessions[socket.handshake.sessionID].userName = userName;

        // Return succesful login (including setting up user as logged in)
        emitMessage(event, {
            ok: true
        }, socket);

        // Find the gamer so we can send the info
        gamer(db).findGamerBySid(socket.handshake.sessionID, function (err, gamer) {
            if (err) {
                return;
            }

            // Fire off gamer joined to all connections minus our own
            emitMessageAll(io, eventName, {
                ok: true
                , result: gamer
            }, socket.handshake.sessionID);
        });
    });
};

// Export functions
exports.registerHandler = registerHandler;
exports.loginHandler = loginHandler;
