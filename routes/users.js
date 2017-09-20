var express = require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var User = require("../models/user")

router.get('/register', function(req, res){
  res.render('register');
});

router.get('/login', function(req, res){
  res.render('login');
});



// USER REGISTRATION

router.post('/register', function(req, res, next){
  var email = req.body.email;
  var username = req.body.username;
  var password = req.body.userPass;
  var confirmUserPass = req.body.confirmUserPass;


  // VALIDATION
  req.checkBody('email', '* Email is required *').notEmpty();
  req.checkBody('email', '* Email is not valid *').isEmail();
  req.checkBody('username', '* User name is required *').notEmpty();
  req.checkBody('userPass', '* Password is required *').notEmpty();
  req.checkBody('confirmUserPass', '* Password does not match *').equals(req.body.userPass);

  var errors = req.validationErrors();
  
  console.log(errors);

  if (errors) {
    res.render ('register', {
      errors: errors
    });

  } else {
    
    var newUser = new User ({
      username: username,
      email: email,
      password: password,
      admin: false
    });


    User.createUser(newUser, function(err, user){
      if(err) throw err;
      console.log(user);
      req.flash('success_msg', 'You are now registered and pending admin approval');
      return res.redirect('/users/login');
    });
  
  }

});



// USER LOGIN PROCEDURES

passport.use(new LocalStrategy(
  function(username, password, done) {
    User.getUserByUsername(username, function(err, user){
      if(err) throw err;
      if(!user){
        return done(null, false, {message: 'Invalid Username'});
      }
      User.comparePassword(password, user.password, function(err, isMatch){
        if(err) throw err;
        if(isMatch){
          return done(null, user)
        } else {
          return done(null, false, {message: 'Invalid Password'});
        }
      });
    });
  }
));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done){
  User.getUserById(id, function(err, user) {
    done(err, user);
  });
});

router.post('/login', passport.authenticate('local', {successRedirect: '/', failureRedirect: '/users/login', failureFlash: true}), function(req, res) {
  res.redirect('/');
});


router.get('/logout', function(req, res) {
  req.logout();
  req.flash('success_msg', 'You have logged out successfully');
  res.redirect('/users/login');
});


module.exports = router;