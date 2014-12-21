module.exports = function(db) {
  var Gamer = function() {};

  //
  // Locate a gamer by his session id
  //
  Gamer.findGamerBySid = function(sid, callback) {
    db.collection('gamers').findOne({sid: sid}, callback);
  };

  //
  // Locate a list of gamers by their session ids
  //
  Gamer.findAllGamersBySids = function(sids, callback) {
    db.collection('gamers').find({sid: {$in: sids}}).toArray(callback);
  };

  //
  // Update the last active time for a list of gamers by their session ids
  //
  Gamer.updateGamersUpdatedDateBySids = function(sids, callback) {
    db.collection('gamers').update({sid:{$in: sids}}, {$set: {updatedOn: new Date()}}, {multi:true}, callback);
  };

  //
  // Update a gamers current activity time and session id
  // when they come back after some time away
  //
  Gamer.updateGamer = function(userName, sid, callback) {
    db.collection('gamers').update({userName: userName},
        {$set: {updatedOn: new Date(), sid:sid}},
        {upsert:true}, callback);
  };

  //
  // Initialize the gamer collection, by adding indexes etc
  //
  Gamer.init = function(callback) {
    db.collection('gamers').ensureIndex({updatedOn: 1}, {expireAfterSeconds: (60 * 60)}, callback);
  };

  return Gamer;
};