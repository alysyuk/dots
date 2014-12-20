var emitMessage = require("./shared").emitMessage,
    isAuthenticated = require("./shared").isAuthenticated,
    locateConnectionWithSession = require('./shared').locateConnectionWithSession,
    emitError = require("./shared").emitError;

var game = require('../models/game');

/**
 * This function handles the sending of a chat message between two players in a specific
 * game
 */
var sendMessage = function (io, socket, sessionStore, db) {
    // Easier to keep track of where we emitting messages
    var callingMethodName = "sendMessage",
        eventName = "chatMessage";

    // Function we return that accepts the data from SocketIO
    return function (data) {
        // Verify that we are logged in
        if (!isAuthenticated(socket, sessionStore))
            return emitError(callingMethodName, "User not authenticated", socket);

        // Let's our session id, the game id and the message we 
        // want to save
        var ourSid = socket.handshake.sessionID,
            gameId = data.gameId,
            message = data.message;

        // Use the game id to locate the game
        game(db).findGame(gameId, function (err, gameDoc) {
            // If there is no game return an error message to the calling function on the client
            if (err) {
                return emitError(callingMethodName, err.message, socket);
            }

            // Get the session id of the player we are sending the message to
            // that is simply the other player or the other side in the game
            var destinationSid = gameDoc.player1Sid == ourSid ? gameDoc.player2Sid : gameDoc.player1Sid;

            // Locate the destination connection
            var connection = locateConnectionWithSession(io, destinationSid);

            // If there is no connection it means the other player went away, send an error message
            // to the calling function on the client
            if (connection == null) {
                return emitError(callingMethodName, "User is no longer available", socket);
            }

            // Let's get the calling functions user name
            // and the destination user's user name
            var ourUserId = gameDoc.player1Sid == ourSid ? gameDoc.player1UserName : gameDoc.player2UserName,
                theirUserId = gameDoc.player1Sid == destinationSid ? gameDoc.player1UserName : gameDoc.player2UserName;

            // Save the message to the list of chat messages for the game
            game(db).saveChatMessage(gameId, ourUserId, theirUserId, message, function (err, result) {
                // Failed to save the chat message, notify the calling function on the client about the error
                if (err) {
                    return emitError(callingMethodName, err.message, socket);
                }

                // Notify the destination user about the new chat message
                emitMessage(eventName, {
                    ok: true
                    , result: {fromSid: ourSid, message: message}
                }, connection);

                // Notify the calling function that the message delivery was successful
                emitMessage(callingMethodName, {
                    ok: true
                    , result: {}
                }, socket);
            });
        });
    };
};

exports.sendMessage = sendMessage;