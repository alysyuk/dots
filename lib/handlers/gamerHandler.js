var emitMessage = require("./shared").emitMessage,
    isAuthenticated = require("./shared").isAuthenticated,
    locateConnectionWithSession = require("./shared").locateConnectionWithSession,
    emitError = require("./shared").emitError;

var user = require('../models/user'),
    gamer = require('../models/gamer'),
    game = require('../models/game');

/**
 * Locate all the available gamers by their session ids. We do this by introspecting
 * all available connections for SocketIO. However note that if we wanted to use
 * the cluster functionality in Node.JS we would probably have to rewrite this as
 * a lot of the users might be living in different processes and by default SocketIO
 * is only single process aware.
 */
var findAllAvailableGamers = function (io, socket, sessionStore, db) {
    // Easier to keep track of where we emitting messages
    var callingMethodName = "findAllAvailableGamers";

    // Function we return that accepts the data from SocketIO
    return function (data) {
        // Ensure the user is logged on and emit an error to the calling function if it's not the case
        if (!isAuthenticated(socket, sessionStore))
            return emitError(callingMethodName, "User not authenticated", socket);

        // Locate all active socket connections
        var clients = io.sockets.clients(),
            sids = [];

        // Find all the users session ids excluding the calling functions
        // this makes up all current active gamers
        for (var i = 0; i < clients.length; i++) {
            if (clients[i].handshake.sessionID != socket.handshake.sessionID) {
                sids.push(clients[i].handshake.sessionID);
            }
        }

        // Locate all the gamers by their session ids
        gamer(db).findAllGamersBySids(sids, function (err, gamers) {
            // If there is an error during the query return it to the calling function
            if (err){
                return emitError(callingMethodName, err.message, socket);
            }

            // Update All the gamers last active time
            gamer(db).updateGamersUpdatedDateBySids(sids, function (err, result) {
                // If there is an error during the update return it to the calling function
                if (err) {
                    return emitError(callingMethodName, err.message, socket);
                }

                // Emit the list of gamers to the calling function on the client
                emitMessage(callingMethodName, {
                    ok: true
                    , result: gamers
                }, socket);
            });
        });
    };
};

/**
 * Invite a gamer to play a game
 */
var inviteGamer = function (io, socket, sessionStore, db) {
    // Easier to keep track of where we emitting messages
    var callingMethodName = "inviteGamer",
        eventName = "gameInvite";

    // Function we return that accepts the data from SocketIO
    return function (data) {
        // Ensure the user is logged on and emit an error to the calling function if it's not the case
        if (!isAuthenticated(socket, sessionStore))
            return emitError(callingMethodName, "User not authenticated", socket);

        // Locate the destination connection
        var connection = locateConnectionWithSession(io, data.sid);

        // If there is no connection it means the other player went away, send an error message
        // to the calling function on the client
        if (connection == null)
            return emitError(callingMethodName, "Invited user is no longer available", socket);

        // Grab our session id
        var ourSid = socket.handshake.sessionID;

        // Locate our gamer object using our session id
        gamer(db).findGamerBySid(ourSid, function (err, gamerDoc) {
            // If there is an error during the query return it to the calling function
            if (err) {
                return emitError(callingMethodName, err.message, socket);
            }

            // Invite the other player to play a game with the
            // calling player, we send the calling players session id and his gamer information
            emitMessage(eventName, {
                ok: true
                , result: {
                    sid: ourSid
                    , gamer: gamerDoc
                }
            }, connection);
        });
    };
};

/**
 * Handles the users decision to decline an invitation to a game
 */
var declineGame = function (io, socket, sessionStore, db) {
    // Easier to keep track of where we emitting messages
    var callingMethodName = "declineGame",
        eventName = "inviteGamer";

    // Function we return that accepts the data from SocketIO
    return function (data) {
        // Ensure the user is logged on and emit an error to the calling function if it's not the case
        if (!isAuthenticated(socket, sessionStore))
            return emitError(callingMethodName, "User not authenticated", socket);

        // Grab our session id
        var ourSid = socket.handshake.sessionID;
        // Locate the destination connection
        var connection = locateConnectionWithSession(io, data.sid);

        // If there is no connection it means the other player went away, send an error message
        // to the calling function on the client
        if (connection == null)
            return emitError(callingMethodName, "User is no longer available", socket);

        // Send an error to the player who sent the invite, outlining the decline of the offer
        // to play a game
        emitError(inviteGamer, "User declined game", connection);
    }
}

/**
 * Handles the users decision to accept an invitation to play a game
 */
var acceptGame = function (io, socket, sessionStore, db) {
    // Easier to keep track of where we emitting messages
    var callingMethodName = "acceptGame",
        eventName = "inviteGamer";

    // Function we return that accepts the data from SocketIO
    return function (data) {
        // Ensure the user is logged on and emit an error to the calling function if it's not the case
        if (!isAuthenticated(socket, sessionStore)) {
            return emitError(callingMethodName, "User not authenticated", socket);
        }
        // Our session id
        var ourSid = socket.handshake.sessionID;
        // Locate the destination connection
        var connection = locateConnectionWithSession(io, data.sid);

        // If there is no connection it means the other player went away, send an error message
        // to the calling function on the client
        if (connection == null)
            return emitError(callingMethodName, "User is no longer available", socket);

        // Locate both the calling player and the destination player by their session ids
        gamer(db).findAllGamersBySids([ourSid, data.sid], function (err, players) {
            // If we have an error notify both the inviter and the invited player about an error
            if (err || players.length != 2) {
                emitError(eventName, "Failed to locate players for game acceptance", connection);
                return emitError(callingMethodName, "Failed to locate players for game acceptance", socket);
            }

            // Grab player 1 and player 2 from the results
            var p1 = players[0];
            var p2 = players[1];

            // Create a new game with player 1 and player 2
            game(db).createGame(p1.sid, p1.userName, p1.fullName, p2.sid, p2.userName, p2.fullName, function (err, gameDoc) {
                // If we have an error notify both the inviter and the invited player about an error
                if (err) {
                    emitError(eventName, "Failed to create a new game", connection);
                    return emitError(callingMethodName, "Failed to create a new game", socket);
                }

                // We have a new game, notify both players about the new game information
                emitMessage(eventName, {ok: true, result: gameDoc}, connection);
                emitMessage(callingMethodName, {ok: true, result: gameDoc}, socket);
            });
        });
    }
}

/**
 * Handles the users decision to accept an invitation to play a game
 */
var placeMarker = function (io, socket, sessionStore, db) {
    // Easier to keep track of where we emitting messages
    var callingMethodName = "placeMarker";
    var eventNameMove = "gameMove";
    var eventNameGameOver = "gameOver";

    // Function we return that accepts the data from SocketIO
    return function (data) {
        // Ensure the user is logged on and emit an error to the calling function if it's not the case
        if (!isAuthenticated(socket, sessionStore))
            return emitError(callingMethodName, "User not authenticated", socket);
        // Grab our session id
        var ourSid = socket.handshake.sessionID;

        // Locate the game we want to place a marker on
        game(db).findGame(data.gameId, function (err, gameDoc) {
            // If there is an error during the query return it to the calling function
            if (err)
                return emitError(callingMethodName, "Could not find the game", socket);

            // Let's get the current board in play
            var board = gameDoc.board;
            // Get the marker for the calling player (if we are the starting player we are X)
            var marker = gameDoc.startingPlayer == ourSid ? "x" : "o";

            // Locate other players session id
            var otherPlayerSid = gameDoc.player1Sid == ourSid ? gameDoc.player2Sid : gameDoc.player1Sid;

            // If we are trying to set a cell that's already set emit an error to the calling function
            if (board[data.y][data.x] == "x" || board[data.y][data.x] == "o")
                return emitError(callingMethodName, "Cell already selected", socket);
            ;

            // Mark the cell with our marker
            board[data.y][data.x] = marker;

            // Attempt to update the board
            game(db).updateBoard(ourSid, data.gameId, otherPlayerSid, board, function (err, result) {
                // If we have an error it was not our turn
                if (err)
                    return emitError(callingMethodName, "Not your turn", socket);

                // Locate the destination connection
                var connection = locateConnectionWithSession(io, otherPlayerSid);

                // If there is no connection it means the other player went away, send an error message
                // to the calling function on the client
                if (connection == null)
                    return emitError(callingMethodName, "User is no longer available", socket);

                // Emit valid move message to caller and the other player
                // this notifies the clients that they can draw the marker on the board
                emitMessage(callingMethodName, {ok: true
                    , result: {y: data.y, x: data.x, marker: marker}}
                , socket);
                emitMessage(eventNameMove, {ok: true
                    , result: {y: data.y, x: data.x, marker: marker}}
                , connection);

                // If there was no winner this turn
                if (isGameOver(board, data.y, data.x, marker) == false) {
                    // If there are still fields left on the board, let's keep playing
                    if (!isGameDraw(board))
                        return;

                    // If there are no open spots left on the board the game
                    // is a draw
                    emitMessage(eventNameGameOver, {ok: true, result: {draw: true}}, socket);
                    return emitMessage(eventNameGameOver, {ok: true, result: {draw: true}}, connection);
                }

                // There was a winner and it was the last user to place a marker (the calling client)
                // signal both players who won the game
                emitMessage(eventNameGameOver, {ok: true, result: {winner: ourSid}}, socket);
                emitMessage(eventNameGameOver, {ok: true, result: {winner: ourSid}}, connection);
            })
        });
    }
}

/**
 * Checks if all the spaces in the board have been used
 */
var isGameDraw = function (board) {
    for (var i = 0; i < board.length; i++) {
        for (var j = 0; j < board[i].length; j++) {
            if (board[i][j] == 0) {
                return false;
            }
        }
    }

    return true;
}

/**
 * Checks from a given marker position if it's a winner
 * on the horizontal, vertical or diagonal
 *
 * [0, 0, 0] [0, 1, 0] [1, 0, 0] [0, 0, 1]
 * [1, 1, 1] [0, 1, 0] [0, 1, 0] [0, 1, 0]
 * [0, 0, 0] [0, 1, 0] [0, 0, 1] [1, 0, 0]
 */
var isGameOver = function (board, y, x, marker) {
    // Check the x and y for the following ranges
    var foundVertical = true;
    var foundHorizontal = true;
    var foundDiagonal = true;

    // y and x = 0 to x = n
    for (var i = 0; i < board[0].length; i++) {
        if (board[y][i] != marker) {
            foundHorizontal = false;
            break;
        }
    }
    // Found a winning position
    if (foundHorizontal)
        return true;

    // x and y = 0 to y = n
    for (var i = 0; i < board.length; i++) {
        if (board[i][x] != marker) {
            foundVertical = false;
            break;
        }
    }

    // Found a winning position
    if (foundVertical)
        return true;

    // 0, 0 to n, n along the diagonal
    for (var i = 0, j = 0; i < board[0].length; i++) {
        if (board[j++][i] != marker) {
            foundDiagonal = false;
            break;
        }
    }

    // Found a winning position
    if (foundDiagonal)
        return true;
    // Reset found diagonal
    foundDiagonal = true;

    // n, 0 to 0, n along the diagonal
    for (var i = board[0].length - 1, j = 0; i > 0; i--) {
        if (board[j++][i] != marker) {
            foundDiagonal = false;
            break;
        }
    }

    // Return result of looking in the diagonal
    return foundDiagonal;
}

// Export functions
exports.findAllAvailableGamers = findAllAvailableGamers;
exports.inviteGamer = inviteGamer;
exports.acceptGame = acceptGame;
exports.declineGame = declineGame;
exports.placeMarker = placeMarker;
exports.isGameOver = isGameOver;
