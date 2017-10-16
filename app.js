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
  var MongoStore = require('connect-mongo')(session);
  var mysql = require('mysql');
  var helpers = require('handlebars-helpers')();
  

  var fs = require('fs');
  require('dotenv').config();
  
// ROUTES AND REQUIRED FILES
  var routes = require('./routes/index');
  var users = require('./routes/users');
  var reports = require('./routes/reports');
  
// HANDLEBARS ENGINE SETUP
  var handlebars = require('express-handlebars').create({defaultLayout: 'main'});
  app.engine('handlebars', handlebars.engine);
  app.set('view engine', 'handlebars');


// SET PORT AND PUBLIC DIRECTORIES
  app.disable('x-powered-by');
  app.set('port', process.env.PORT || 3000);
  app.use(express.static(__dirname + '/public'));


// DATABASE CONNECTION FOR LOGIN
  mongoose.connect('mongodb://' + process.env.MLAB_USER + ':' + process.env.MLAB_PASS + process.env.MLAB_HOST);
  var db = mongoose.connection;

// MIDDLEWARE
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({extended: false}));
  app.use(cookieParser());

  app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: false,
    cookie: { secure: false },
    store: new MongoStore({
    url: 'mongodb://' + process.env.MLAB_USER + ':' + process.env.MLAB_PASS + process.env.MLAB_HOST,
    collection: 'sessions'
  })
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

  app.use(function(req, res, next){
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;
    next();
  });


// ROUTING

  app.use('/', routes);

  app.use('/reports', reports);
  
  app.use('/users', users);

  app.use(function(err, req, res, next){
    console.error(err.stack);
    res.status(500);
    res.render('500');
  });

  app.get('*', function(req, res){
    res.render('404');
  });

// PORT LISTENING 
  app.listen(app.get('port'), function(){
    console.log("Express started at http://localhost:" + app.get('port') + " Press Ctrl-C to terminate");
  });