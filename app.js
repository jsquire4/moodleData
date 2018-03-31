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
  var util = require('util');
  var ipfilter = require('express-ipfilter').IpFilter;
  var winston = require('winston');

  var fs = require('fs');
  require('dotenv').config();
  
// ROUTES AND REQUIRED FILES
  var routes = require('./routes/index');
  var users = require('./routes/users');
  var reports = require('./routes/reports');
  var support = require('./routes/support');
  var mailer = require('./routes/mailer');
  
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
  var fs = require('fs');
  var util = require('util');
  var log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'w'});
  var log_stdout = process.stdout;

  console.log = function(d) { //
    log_file.write(util.format(d) + '\n');
    log_stdout.write(util.format(d) + '\n');
  };

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


// IP Restrictions since InfoSec can't be bothered
  var ips = [[process.env.IP_RANGE_1, process.env.IP_RANGE_2], '::1'];
  app.use(ipfilter(ips, {mode: 'allow'}));

  app.use(function(err, req, res, _next) {
    console.log('Error handler', err);
    if(err){
      res.status(401);
    }else{
      res.status(err.status || 500);
    }
    res.render('401');
  });

// ROUTING
  app.use('/', routes);
  app.use('/reports', reports);
  app.use('/users', users);
  app.use('/support', support);
  app.use('/mailer', mailer);

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