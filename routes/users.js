var express = require('express');
var router = express.Router();

var User = require("../models/user")

router.get('/register', function(req, res){
  res.render('register');
});

router.get('/login', function(req, res){
  res.render('login');
});

router.post('/register', function(req, res){
  var email = req.body.email;
  var userName = req.body.userName;
  var password = req.body.userPass;
  var confirmUserPass = req.body.confirmUserPass;


  // VALIDATION
  req.checkBody('email', '* Email is required *').notEmpty();
  req.checkBody('email', '* Email is not valid *').isEmail();
  req.checkBody('userName', '* User name is required *').notEmpty();
  req.checkBody('userPass', '* Password is required *').notEmpty();
  req.checkBody('confirmUserPass', '* Password does not match *').equals(req.body.userPass);

  var errors = req.getValidationResult();
  
  if (errors) {
    res.render ('register', {
      errors: errors
    });
  } else {
    
    var newUser = new User ({
      userName: userName,
      email: email,
      password: password
    });
  

    User.createUser(newUser, function(err, user){
      if(err) {
        throw err;
      }
      console.log(user);
    });

    req.flash('success_msg', 'You are now registered and your final admin approval is pending');

    res.redirect('/users/login');

  }




});

module.exports = router;