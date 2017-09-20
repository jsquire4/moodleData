var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');
var Schema = mongoose.Schema;

// Schema

var userSchema = new Schema({

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

  admin: {
      type: Boolean,
      default: false
  }

});

var User = module.exports = mongoose.model('User', userSchema);

module.exports.createUser = function(newUser, returns) {
  bcrypt.genSalt(10, function(err, salt) {
    bcrypt.hash(newUser.password, salt, function(err, hash) {
        newUser.password = hash;
        newUser.save(callback);
    });
  });
}
