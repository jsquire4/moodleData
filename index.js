// NODE MODULES
  var express = require('express');
  var app = express();
  app.disable('x-powered-by');

// HANDLEBARS ENGINE SETUP
  var handlebars = require('express-handlebars').create({defaultLayout: 'main'});
  app.engine('handlebars', handlebars.engine);
  app.set('view engine', 'handlebars');


// SET PORT AND PUBLIC DIRECTORIES
  app.set('port', process.env.PORT || 3000);
  app.use(express.static(__dirname + '/public'));


// ROUTES
  app.get('/', function(req, res){
    res.render('home');
  });

  app.get('/about', function(req, res){
    res.render('about');
  });


// ERROR HANDLING
  app.use(function(err, req, res, next){
    res.status(404);
    res.render('404');
  });

  app.use(function(err, req, res, next){
    console.error(err.stack);
    res.status(500);
    res.render('500');
  });


// PORT LISTENING 
  app.listen(app.get('port'), function(){
    console.log("Express started at http://localhost:" + app.get('port') + " Press Ctrl-C to terminate");
  });