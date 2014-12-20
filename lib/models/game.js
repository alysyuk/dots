var ObjectID = require('mongodb').ObjectID;

module.exports = function(db) {
  var Game = function() {}

  //
  // Create a new game, it contains all the information about the two players, the empty board, the whole
  // game chat record, who is starting the game and who is the current player.
  // 
  Game.createGame = function(p1Sid, p1UserName, p1FullName, p2Sid, p2UserName, p2FullName, callback) {
    db.collection('games').insert({
        player1Sid: p1Sid
      , player1UserName: p1UserName
      , player1FullName: p1FullName
      , player2Sid: p2Sid
      , player2UserName: p2UserName
      , player2FullName: p2FullName
      , board: [
          [0, 0, 0, 0]
        , [0, 0, 0, 0]
        , [0, 0, 0, 0]
        , [0, 0, 0, 0]
      ]
      , chat: []
      , createdOn: new Date()
      , startingPlayer: p1Sid
      , currentPlayer: p1Sid
    }, function(err, result) {
      if(err) return callback(err);
      callback(null, Array.isArray(result) ? result[0] : result);
    });
  };

  //
  // Locate an existing game by it's game id
  //
  Game.findGame = function(gameId, callback) {
    db.collection('games').findOne({_id: new ObjectID(gameId)}, function(err, doc) {
      if(err) return callback(err);
      if(doc == null) return callback(new Error("could not find the game with id " + gameId));
      return callback(null, doc);
    })
  }

  //
  // Attempt to update the board for a specific game and player
  // the update fails if the current players is not the player attempting to update the board
  // notice that since we are doing multiple sets we are using the $atomic operation to ensure
  // we don't get any interleaved updates in between the two sets
  //
  Game.updateBoard = function(sid, gameId, nextSid, board, callback) {
    db.collection('games').update(
        {_id: new ObjectID(gameId), currentPlayer: sid, $atomic:true}
      , {$set: {board: board, currentPlayer: nextSid}}, function(err, result) {
        if(err) return callback(err);
        if(result == 0) return callback(new Error("It is not your turn"));
        callback(null, null);
      });
  }

  //
  // Save a chat message to it's corresponding game 
  // we also save the user names for the sender and the receiver
  //
  Game.saveChatMessage = function(gameId, fromUserId, toUserId, message, callback) {
    db.collection('games').update(
        {_id: new ObjectID(gameId)}
      , {$push: {chat: {from: fromUserId, to: toUserId, message: message}}}
      , function(err, result) {
        if(err) return callback(err);
        if(result == 0) return callback(new Error("No game found to update"));
        callback(null, null);
      }
    )
  }

  // Return Game object class
  return Game;
}