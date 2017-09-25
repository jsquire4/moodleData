var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');
var Schema = mongoose.Schema;


// Schema

var userSchema = new Schema({

  first: {
    type: String
  },

  last: {
    type: String
  },

  username: {
      type: String,
      index: true
  },

  password: {
      type: String
  },

  email: {
      type: String
  },

  access: {
    type: Boolean,
    default: false
  },

  admin: {
      type: Boolean,
      default: false
  }

});

var User = module.exports = mongoose.model('User', userSchema);

module.exports.createUser = function(newUser, callback) {
  bcrypt.genSalt(10, function(err, salt) {
    bcrypt.hash(newUser.password, salt, function(err, hash) {
        newUser.password = hash;
        newUser.save(callback);
    });
  });
}

module.exports.getUserByUsername = function(username, callback){
  var query = {username: username};
  return User.findOne(query, callback);
}

module.exports.comparePassword = function(compPass, hash, callback){
  bcrypt.compare(compPass, hash, function(err, isMatch) {
    if(err) throw err;
    callback(null, isMatch);
  });
}

module.exports.getUserById = function(id, callback){
  User.findById(id, callback);
  console.log(id);
}

module.exports.getUnverified = function(callback){
  
  User.find({'admin': false}, function(err, docs){
    if(err) throw err;
    callback(null, docs);    
  });

}
















