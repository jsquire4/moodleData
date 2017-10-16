var express = require('express');
var router = express.Router();

var Reporter = require("../models/reports")

router.get('/index', ensureVerification, function(req, res){
  res.render('reportindex');
});


// router.post('/report/custom', function(req, res){
//   // TODO: Create creative way to access more data easily from UI
//   var fromDate = req.body.fromdate;
//   var toDate = req.body.toDate;
//   var tables = "Nothing here";

//   Reporter.customReport(fromDate, toDate, tables, function(err, results){
//     if (err) throw err;
//     res.render('results', {results: results, fromDate: fromDate, toDate: toDate});
//   });
// });

router.post('/report', ensureVerification, function(req, res){
  var reportType = req.body.reporttype;
  var fromDate = req.body.fromdate;
  var toDate = req.body.todate;

  Reporter.getReport(fromDate, toDate, reportType, function(err, report){
    if (err) throw err;
    res.render('report', {report: report});
  });
});

// router.post('/report/showdata', function(req, res){
//   var reportType = "No idea";
//   var fromDate = "No idea";
//   var toDate = "No idea";

//   Reporter.showFullData(fromDate, toDate, reportType, function(err, results){
//     if (err) throw err;
//     res.render('showfull', {results: results});
//   });
// });

function ensureVerification(req, res, next){
  if(req.isAuthenticated()){
    if(req.user.access){
      next();
    } else {
      req.flash('error_msg', "You are not permitted to see this page.  Contact an administrator for access");
      res.redirect('/');
    }
    
  } else {
    req.flash('error_msg', 'You are not logged in.  Log in or register to continue.');
    res.redirect('/users/login');
  }
}

module.exports = router;  