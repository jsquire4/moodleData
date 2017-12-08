var express = require('express');
var router = express.Router();

var Reporter = require("../models/reports");
var EhbReport = require("../models/ehb");

router.get('/index', ensureVerification, function(req, res){
  res.render('reportindex');
});

router.post('/report', ensureVerification, function(req, res){
  var reportType = req.body.reporttype;
  var fromDate = req.body.fromdate;
  var toDate = req.body.todate;

  if (reportType == "ehb"){
    
    EhbReport.createCourses(fromDate, toDate, function(err, report){
      EhbReport.listCourses(function(err, courses){
        res.render('ehbReportCreator', {courses: courses});
      });
    });

  } else {
    Reporter.getReport(fromDate, toDate, reportType, function(err, report){
      if (err) throw err;
      res.render('report', {report: report});
    });
  }
    
});

router.get('/')

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

