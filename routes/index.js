var express = require('express');
var router = express.Router();

router.get('/', function(req, res){
  res.render('home', {user: req.user});
});

router.get('/loggedin', ensureAuthentication, function(req, res){
  res.render('loggedin');
});

router.get('/about', function(req, res){
  res.render('about');
});

router.get('/support', function(req, res){
  res.render('support');
});

router.get('/500', function(req, res){
  res.render('500');
});

function ensureAuthentication(req, res, next){
  if(req.isAuthenticated()){
    next();
  } else {
    req.flash('error_msg', 'You are not logged in.  Log in or register to continue.');
    res.redirect('/users/login');
  }
}

module.exports = router; 