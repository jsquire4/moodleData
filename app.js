// NODE MODULES
  var express = require('express');
  var app = express();
  var path = require('path');
  var bodyParser = require('body-parser');
  var expressValidator = require('express-validator');
  var session = require('express-session');
  var passport = require('passport');
  var LocalStrategy = require('passport-local').Strategy;
  var mongo = require('mongodb');
  var cookieParser = require('cookie-parser');
  var flash = require('connect-flash');
  var mongoose = require('mongoose');
  var routes = require('./routes/index');
  var users = require('./routes/users');
  var mongoStore = require('connect-mongo')(session);
  var fs = require('fs');



// HANDLEBARS ENGINE SETUP
  var handlebars = require('express-handlebars').create({defaultLayout: 'main'});
  app.engine('handlebars', handlebars.engine);
  app.set('view engine', 'handlebars');


// SET PORT AND PUBLIC DIRECTORIES
  app.disable('x-powered-by');
  app.set('port', process.env.PORT || 3000);
  app.use(express.static(__dirname + '/public'));


// DATABASE CONNECTION FOR LOGIN
  
  mongoose.connect('mongodb://' + process.env.MLAB_USER + ':' + process.env.MLAB_PASS + '@ds141464.mlab.com:41464/datareaderprofiles');
  var db = mongoose.connection;

// MIDDLEWARE
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({extended: false}));
  app.use(cookieParser());

  app.use(session({
    secret: "mysecretkeyherethatnoonewillguessoreverfindoutforsure",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: true }
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  app.use(expressValidator({
    errorFormatter: function(param, msg, value){
      var namespace = param.split('.'), 
      root = namespace.shift(),
      formParam = root;

      while(namespace.length) {
        formParam += '[' + namespace.shift() + ']';
      }

      return {
        param: formParam,
        msg: msg,
        value: value
      };
    }
  }));

  app.use(flash());

  app.use(function (req, res, next){
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
  });


// ROUTING

  app.use('/', routes);
  
  app.use('/users', users);
  
  // app.use(function(err, req, res, next){
  //   res.status(404);
  //   res.render('404');
  // });

  // app.use(function(err, req, res, next){
  //   console.error(err.stack);
  //   res.status(500);
  //   res.render('500');
  // });


// PORT LISTENING 
  app.listen(app.get('port'), function(){
    console.log("Express started at http://localhost:" + app.get('port') + " Press Ctrl-C to terminate");
  });