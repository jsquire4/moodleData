var express = require("express"); 
var router = express.Router();
var Reporter = require("../models/reports");
var EhbReport = require("../models/ehb");
var xl = require("excel4node");
var fs = require('fs');



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
        res.render('ehbReportCreator', {courses: courses, fromDate: fromDate, toDate: toDate, returningToSaved: false});
      });
    });
  } else {
    Reporter.getReport(fromDate, toDate, reportType, function(err, report){
      if (err) throw err;
      res.render('report', {report: report});
    });
  }
});

/* 
  Coded myself into a corner with the form saving and date parsing....
  Sorry to whoever will inherit this.
  Also, keep in mind that this runs off of a free MLAB db, so we have to be conscious of the amount of data we store.
  Each new report deletes the old one, which isn't ideal, but also not a huge deal since you can just generate a new one with the old dates.
*/

router.get('/ehb', ensureVerification, function(req, res){
  EhbReport.listCourses(function(err, courses){
    var fromDate = courses[0].reportingPeriodFrom;
    var toDate = courses[0].reportingPeriodTo;
    fromDate = fromDate.format("M dS Y");
    toDate = toDate.format("M dS Y");
    if (err) throw err;
    res.render('ehbReportCreator', {courses: courses, fromDate: fromDate, toDate: toDate, returningToSaved: true}); 
  });
});

router.get('/ehb/:course_id', ensureVerification, function(req, res) {
  EhbReport.findById(req.params.course_id, function(err, course) {
      if (err) {
        res.sendStatus(404);
        console.log(err);
      }
      res.send(course);
  });
});

router.post('/ehb/:course_id', ensureVerification, function(req, res) {
  var data = req.body;
  EhbReport.findById(req.params.course_id, function(err, course) {
    if (err) throw err;

    EhbReport.updateCourse(course, data, function(err, response){
      if (err) throw err;
      res.sendStatus(200);
    });
  });
});

router.get('/generate-excel/ehb', ensureVerification, function(req, res) {
  EhbReport.generateExcelFile(function(err, fileName){
    
    setTimeout(function(){ // I don't know how else to do this right now, but it makes me cringe too don't worry
      if (fs.existsSync(fileName)) {
        res.download(fileName);
      } else {
        setTimeout(function(){
          if (fs.existsSync(fileName)) {
            res.download(fileName);
          } else {
            res.sendStatus(500);
          }
        }, 5000);
      }
    }, 3000);
  
  });
});

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

