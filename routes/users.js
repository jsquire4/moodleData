var express = require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mongoose = require('mongoose');

var User = require("../models/user")

router.get('/register', function(req, res){
  res.render('register', {user: req.user});
});

router.get('/login', function(req, res){
  res.render('login', {user: req.user});
});

router.get('/verify', function(req, res){
  User.getUnverified(function(err, pendingUsers){
    if(err) throw err;
    res.render('verify', {pendingUsers: pendingUsers});
  });
});

router.post('/verify', function(req, res){

});



// USER REGISTRATION

router.post('/register', function(req, res, next){
  var first = req.body.first;
  var last = req.body.last;
  var email = req.body.email;
  var username = req.body.username;
  var password = req.body.userPass;
  var confirmUserPass = req.body.confirmUserPass;


  // VALIDATION
  req.checkBody('first', '* First name is required *').notEmpty();
  req.checkBody('last', '* Last name is required *').notEmpty();
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
      first: first,
      last: last,
      username: username,
      email: email,
      password: password,
      access: false,
      admin: false
    });

    User.createUser(newUser, function(err, user){
      if(err) throw err;
    });

    req.flash('success_msg', 'You are now registered and pending admin approval');
    res.redirect('/users/login');
  
  }

});



// USER LOGIN PROCEDURES

passport.serializeUser(function(user, done) {
  done(null, user._id);
});

passport.deserializeUser(function(id, done){
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use('login', new LocalStrategy({
    passReqToCallback : true
  },
  function(req, username, password, done) { 
    User.findOne({ 'username' :  username }, 
      function(err, user) {
        if (err)
          return done(err);
        if (!user){
          console.log('User Not Found with username '+ username);
          return done(null, false, 
                req.flash('message', 'User Not found.'));                 
        }
        
        User.comparePassword(password, user.password, function(err, isMatch){
          if(err) throw err;
          if(isMatch){
            return done(null, user);
          } else {
            return done(null, false, {message: "Incorrect Password"});
          }
        });
      }
    );
}));



// router.post('/login', passport.authenticate('local', {failureRedirect: '/users/login', failureFlash: true}), function(req, res) {
//   res.render('/404', {user: res.user, error: res.error});
// });

router.post('/login', passport.authenticate('login', { successRedirect: '../loggedin', failureRedirect: '../notloggedin', failureFlash: true }));


router.get('/logout', function(req, res) {
  req.logout();
  req.flash('success_msg', 'You have logged out successfully');
  res.redirect('/users/login');
});


module.exports = router;