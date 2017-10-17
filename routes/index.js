var express = require('express');
var router = express.Router();
var Ticket = require("../models/support");
var User = require('../models/user');

router.get('/', function(req, res){
  res.render('home', {user: req.user});
});

router.get('/about', function(req, res){
  res.render('about');
});


function loggedIn(req, res, next){
  if(req.isAuthenticated()){
    next();
  } else {
    req.flash('error_msg', 'You are not logged in.  Log in or register to continue.');
    res.redirect('/users/login');
  }
}

module.exports = router; 