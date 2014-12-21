var crypto = require('crypto');

module.exports = function(db) {
  var User = function() {};

  //
  // Locate a user by a user name
  //
  User.findByUser = function(userName, callback) {
    db.collection('users').findOne({userName: userName}, callback);
  };

  //
  // Locate a user by user name and password
  //
  User.findByUserAndPassword = function(userName, password, callback) {
    // Hash password
    var sha1 = crypto.createHash('sha1');
    sha1.update(password);
    // Get digest
    var hashedPassword = sha1.digest('hex');
    // Locate user
    db.collection('users').findOne({userName: userName, password: hashedPassword}, callback);
  };

  //
  // Create a new user with full name and password
  //
  User.createUser = function(fullName, userName, password, callback) {
    // Hash password
    var sha1 = crypto.createHash('sha1');
    sha1.update(password);
    // Get digest
    var hashedPassword = sha1.digest('hex');
    // Insert user
    db.collection('users').insert({fullName: fullName, userName: userName, password: hashedPassword}, callback);
  };

  return User;
};