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

router.get('/404',  function(req, res){
  res.render('404');
});

function ensureAuthentication(req, res, next){
  if(req.isAuthenticated()){
    next();
  } else {
    req.flash('error_msg', 'You are not logged in.  Log in or register to continue.');
    res.redirect('/notloggedin');
  }
}

function isLoggedIn(req, res, next){
  var authed = false;
  if(req.isAuthenticated()){
    authed = true;
    return next(authed);
  } else {
    return next(authed);
  }
}

module.exports = router; 