// Contains the application state
var applicationState = {
    sessionId: null
}

// Create an instance of the API class
var api = new API();

// Create a template handler with all the templates
// used in the application
var templateHandler = new TemplateHandler({
    "main": "/templates/main.ms",
    "dashboard": "/templates/dashboard.ms",
    "board": "/templates/board.ms",
    "declineGame": "/templates/declineGame.ms"
});

// Load all the templates and once it's done
// register up all the initial button handlers
templateHandler.start(function (err) {

    // Render the main view in the #view div
    templateHandler.setTemplate("#view", "main", {});

    // Wire up the buttons for the main view
    $('#register_button').click(registerButtonHandler(applicationState, api, templateHandler));
    $('#login_button').click(loginButtonHandler(applicationState, api, templateHandler));

    // Wire up invite box buttons (this is in the main view)
    $('#invite_box_accept').click(inviteAcceptButtonHandler(applicationState, api, templateHandler));
    $('#invite_box_decline').click(inviteDeclineButtonHandler(applicationState, api, templateHandler));
})

/*********************************************************************************************
 * Application events we listen to
 ********************************************************************************************/
/**
 * The init event, the server has set up everything an assigned us
 * a session id that we can use in the application
 */
api.on("init", function (err, data) {
    applicationState.sessionId = data;
});

/**
 * The opponent made a valid move, render the move on the board
 */
api.on('gameMove', function (err, data) {
    if (err) {
        return;
    }
    // Get the move data
    var marker = data.marker,
        y = data.y,
        x = data.x,
        // Select the right box and mark it
        cellIdImage = "#row" + y + "cell" + x + " img";
    // It was our turn, let's show the mark we set down
    if (marker == 'x') {
        $(cellIdImage).attr("src", "/img/cross_1.png");
    } else {
        $(cellIdImage).attr("src", "/img/circle_1.png");
    }
});

/**
 * The game was won, display victory / defeat / draw dialog
 */
api.on('gameOver', function (err, data) {
    if (data.draw === true) {
        generalBoxShow("It was a draw", "<p>Your equally good, it's a draw</p>");
    } else if (data.winner == applicationState.sessionId) {
        generalBoxShow("Congratulations", "<p>You won</p>");
    } else {
        generalBoxShow("You lost", "<p>Sorry, not your day</p>");
    }

    // Let's load the first 100 public available games
    api.findAllAvailableGamers(function (err, gamers) {
        if (err) {
            return errorBoxShow(err.error);
        }

        // Save the list of games in our game state
        applicationState.gamers = gamers;
        // Let's go to the dashboard of the game
        templateHandler.setTemplate("#view", "dashboard", {gamers: gamers});
        // Add handlers to the event
        for (var i = 0; i < gamers.length; i++) {
            $("#gamer_" + gamers[i]._id).click(inviteGamerButtonHandler(applicationState, api, templateHandler));
        }
    });
});

/**
 * The user was invited to play a game, show the invitation acceptance / decline box
 */
api.on('gameInvite', function (err, data) {
    if (data == null) {
        return;
    }
    // Save the invitation in our application state
    applicationState.invite = data;
    // Open the invite box
    gameInviteBoxShow(data.gamer);
});

/**
 * The other player sent a message, render the message in the chat box
 */
api.on('chatMessage', function (err, data) {
    if (err) {
        return;
    }
    // Get the message
    var message = data.message;
    // Get the chat window  
    var chatWindow = $('#chat');
    // Push the current message to the bottom
    chatWindow.append('<p class="chat_msg_other">' + getDateTimeString() + '&#62; ' + message + '</p>');
});

/**
 * A new gamer logged on, display the new user in the list of available gamers
 * to play
 */
api.on('gamerJoined', function (err, data) {
    if (err) {
        return;
    }
    // Get the gamer
    var gamer = data;
    // Check if we have the gamer already
    if (applicationState.gamers == null) {
        return;
    }
    // Check if the gamer already exists and if it does 
    var found = false;

    // replace it with the new reference
    for (var i = 0; i < applicationState.gamers.length; i++) {
        var _gamer = applicationState.gamers[i];

        if (_gamer.userName == gamer.userName) {
            found = true;
            // Update the sid and update on
            _gamer.sid = gamer.sid;
            _gamer.updatedOn = gamer.updatedOn;
            break;
        }
    }

    // If not found let's add it to the list
    if (!found) {
        applicationState.gamers.push(gamer);
    }
    // If we currently have the dashboard
    if (templateHandler.isTemplate("dashboard")) {
        var gamers = applicationState.gamers;
        // Let's go to the dashboard of the game
        templateHandler.setTemplate("#view", "dashboard", {gamers: gamers});
        // Add handlers to the event
        for (var i = 0; i < gamers.length; i++) {
            $("#gamer_" + gamers[i]._id).click(inviteGamerButtonHandler(applicationState, api, templateHandler));
        }
    }
});

/*********************************************************************************************
 * Handlers
 ********************************************************************************************/
/**
 * Handles the attempt to register a new user
 */
var registerButtonHandler = function (applicationState, api, templateHandler) {
    return function () {
        // Lets get the values for the registration
        var fullName = $('#inputFullNameRegister').val(),
            userName = $('#inputUserNameRegister').val(),
            password = $('#inputPasswordRegister').val();

        // Attempt to register a new user
        api.register(fullName, userName, password, function (err, data) {
            // If we have an error show the error message to the user
            if (err) {
                return errorBoxShow(err.error);
            }

            // Load all the available gamers
            api.findAllAvailableGamers(function (err, gamers) {
                // If we have an error show the error message to the user        
                if (err) {
                    return errorBoxShow(err.error);
                }

                // Save the list of games in our game state
                applicationState.gamers = gamers;

                // Show the main dashboard view and render with all the available players
                templateHandler.setTemplate("#view", "dashboard", {gamers: gamers});

                // Add handlers for each new player so we can play them
                for (var i = 0; i < gamers.length; i++) {
                    $("#gamer_" + gamers[i]._id).click(inviteGamerButtonHandler(applicationState, api, templateHandler));
                }
            });
        });
    }
}

/**
 * Handles the attempt to login
 */
var loginButtonHandler = function (applicationState, api, templateHandler) {
    return function () {
        // Lets get the values for the login
        var userName = $('#inputUserNameLogin').val(),
            password = $('#inputPasswordLogin').val();

        // Attempt to login the user
        api.login(userName, password, function (err, data) {
            // If we have an error show the error message to the user
            if (err) {
                return errorBoxShow(err.error);
            }

            // Load all the available gamers
            api.findAllAvailableGamers(function (err, gamers) {
                // If we have an error show the error message to the user        
                if (err) {
                    return errorBoxShow(err.error);
                }

                // Save the list of games in our game state
                applicationState.gamers = gamers;

                // Show the main dashboard view and render with all the available players
                templateHandler.setTemplate("#view", "dashboard", {gamers: gamers});

                // Add handlers for each new player so we can play them
                for (var i = 0; i < gamers.length; i++) {
                    $("#gamer_" + gamers[i]._id).click(inviteGamerButtonHandler(applicationState, api, templateHandler));
                }
            });
        })
    }
}

/**
 * Send an invitation to a player to pay a game
 */
var inviteGamerButtonHandler = function (applicationState, api, templateHandler) {
    return function (element) {
        var gamer_id = element.currentTarget.id,
            id = gamer_id.split(/\_/)[1];

        // Locate the gamer object
        for (var i = 0; i < applicationState.gamers.length; i++) {
            if (applicationState.gamers[i]._id == id) {
                var gamer = applicationState.gamers[i];

                // Attempt to invite the gamer to play
                api.inviteGamer(gamer, function (err, game) {
                    // If we have an error show the declined game to the user
                    if (err) {
                        return decline_box_show(templateHandler, gamer);
                    }

                    // Set up the board for a game
                    setupBoardGame(applicationState, api, templateHandler, game);
                });
            }
        }
    };
};

/**
 * Accept an invitation to play a game
 */
var inviteAcceptButtonHandler = function (applicationState, api, templateHandler) {
    return function () {
        // Accept the game invite
        api.acceptGame(applicationState.invite, function (err, game) {
            // If we have an error show the error message to the user        
            if (err) {
                return errorBoxShow(err.error);
            }

            // Set up the board for a game
            setupBoardGame(applicationState, api, templateHandler, game);
        });
    }
}

/**
 * Accept an invitation to play a game
 */
var inviteDeclineButtonHandler = function (applicationState, api, templateHandler) {
    return function () {
        // Decline the game invite
        api.declineGame(applicationState.invite, function (err, result) {
            // If we have an error show the error message to the user        
            if (err) {
                return errorBoxShow(err.error);
            }
            // No need to do anything as we declined the game and we are still showing the dashboard
        });
    }
}

/*********************************************************************************************
 * Setup methods
 ********************************************************************************************/
/**
 * Set up a new game board and add handlers to all the cells of the board
 */
var setupBoardGame = function (applicationState, api, templateHandler, game) {
    // Save current game to state
    applicationState.game = game;
    // Let's render the board game with the chat window
    templateHandler.setTemplate("#view", "board", {});
    // Set the marker for our player (X if we are the starting player)
    applicationState.marker = applicationState.sessionId == game.currentPlayer ? "x" : "o";
    // Get all the rows
    var rows = $('#board div');

    // Add an event handler to each cell
    for (var i = 0; i < rows.length; i++) {
        var cells = $('#' + rows[i].id + " span");

        // For each cell create and add the handler
        for (var j = 0; j < cells.length; j++) {
            $("#" + cells[j].id).click(gameBoardCellHandler(applicationState, api, templateHandler, game));
        }
    }

    // Map up the chat handler
    $('#chatMessage').keypress(chatHandler(applicationState, api, templateHandler, game));
}

/**
 * Handle chat messages from the user, (activates on the return key)
 */
var chatHandler = function (applicationState, api, templateHandler, game) {
    return function (e) {
        if (e.which == 13) {
            var chatInput = $('#chatMessage');
            var chatWindow = $('#chat');
            // Fetch the message the user entered
            var message = chatInput.val();
            if (applicationState.game == null) {
                return;
            }

            // Send the message to the other player
            api.sendMessage(applicationState.game._id, message, function (err, data) {
                // If we have an error show the error message to the user        
                if (err) {
                    return errorBoxShow(err.error);
                }

                // Push the current message to the bottom
                chatWindow.append('<p class="chat_msg_current">' + getDateTimeString() + '&#62; ' + message + "</p>");
                // Clear out the messages
                chatInput.val('');
            });
        }
    }
}

/**
 * Create a cell click handler that will send the events to the server when the user clicks
 * on an event, and also show the result
 */
var gameBoardCellHandler = function (applicationState, api, templateHandler, game) {
    return function () {
        // Split up the id to get the cell position
        var rowNumber = parseInt(this.id.split("cell")[0].split("row")[1], 10),
            cellNumber = parseInt(this.id.split("cell")[1], 10),
            cellId = this.id,
            cellIdImage = "#" + cellId + " img";

        // Let's attempt to do a move
        api.placeMarker(applicationState.game._id, cellNumber, rowNumber, function (err, data) {
            if (err) {
                return errorBoxShow(err.error);
            }

            // If we won
            if (data.winner != null && data.winner == applicationState.sessionId) {
                generalBoxShow("Congratulations", "<p>You won</p>");
            } else if (data.winner != null) {
                generalBoxShow("You lost", "<p>You got beaten buddy</p>");
            }

            if (data.marker == 'x') {
                $(cellIdImage).attr("src", "/img/cross_1.png");
            } else {
                $(cellIdImage).attr("src", "/img/circle_1.png");
            }
        });
    }
}

/*********************************************************************************************
 * Helper methods
 ********************************************************************************************/

/**
 * Get a date time string
 */
var getDateTimeString = function () {
    var date = new Date(),
        string = date.getHours() < 10 ? "0" + date.getHours() : date.getHours();
    string += ":" + (date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes());
    string += ":" + (date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds());
    return string;
}

/**
 * Show an error message box
 */
var errorBoxShow = function (error) {
    // Set fields for the error
    $('#status_box_header').html("Registration Error");
    $('#status_box_body').html(error);
    // Show the modal box
    $('#status_box').modal({backdrop: true, show: true})
}

/**
 * General message box with configurable title and body content
 */
var generalBoxShow = function (title, body) {
    // Set fields for the error
    $('#status_box_header').html(title);
    $('#status_box_body').html(body);
    // Show the modal box
    $('#status_box').modal({backdrop: true, show: true})
}

/**
 * Show a game decline message box
 */
var decline_box_show = function (templateHandler, gamer) {
    // Set fields for the error
    $('#status_box_header').html("Invitation to game was declined");
    $('#status_box_body').html(templateHandler.render("declineGame", gamer));
    // Show the modal box
    $('#status_box').modal({backdrop: true, show: true})
}

/**
 * Show a game invite message box
 */
var gameInviteBoxShow = function (gamer) {
    // Set fields for the error
    $('#invite_box_header').html("You have been invited to a game");
    $('#invite_box_body').html("The user <strong>" + gamer.userName + "</strong> has challenged you to a game");
    // Show the modal box
    $('#invite_box').modal({backdrop: true, show: true})
    // Add the handlers

}
