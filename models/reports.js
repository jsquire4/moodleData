var mysql = require('mysql');
require('datejs');
require('dotenv').config();


// MY_SQL CONNECTION

var connection = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASS,
  database: 'moodle'
});

var Reporter = module.exports;



// PRIVATE CLASS METHODS

function getQuery(reportType){
  if (reportType == "audit") {
    return "SELECT c.fullname AS 'CourseName', g.name AS 'GroupName', gm.userid AS 'UserID', FROM_UNIXTIME(gm.timeadded, '%c-%d-%Y') AS 'timeAdded' FROM mdl_groups g  JOIN mdl_groups_members AS gm ON g.id = gm.groupid JOIN mdl_course AS c ON g.courseid = c.id WHERE (g.name LIKE '%udit%')";
  } else if (reportType == "feedback") {
    
    return "SELECT fbc.id AS 'fbSubmissionId', c.id AS 'CourseId', fbc.userid AS 'UserId', FROM_UNIXTIME(fbc.timemodified, '%c-%d-%Y') AS 'Time Submitted', c.fullname AS 'CourseName', fbi.name AS 'Question', REPLACE(REPLACE(fbv.value, '\r', ''), '\n', '<br>') AS 'Answer' FROM mdl_feedback_completed AS fbc JOIN mdl_feedback_value AS fbv ON fbc.id = fbv.completed JOIN mdl_feedback_item AS fbi ON fbv.item = fbi.id JOIN mdl_groups_members AS gm ON fbc.userid = gm.userid JOIN mdl_groups AS g ON gm.groupid = g.id JOIN mdl_course AS c ON g.courseid = c.id WHERE (g.name NOT LIKE '%Audit%' OR '%audit%') && (fbi.name LIKE'%understanding of the subject matter%' OR fbi.name LIKE '%identified actions%' OR fbi.name LIKE '%information was presented%' OR fbi.name LIKE'%I was satisfied with th%') ORDER BY fbSubmissionId, CourseId, userId;";
  } else if (reportType == "grades") {
    
    return "SELECT u.id AS 'UserId', c.id As 'CourseId', u.firstname AS 'First', u.lastname AS 'Last', c.fullname AS 'Course', gi.itemname AS 'ItemName', ROUND (gg.finalgrade, 2) AS 'Grade', DATE_FORMAT(FROM_UNIXTIME(gg.timemodified), '%c-%d-%Y') AS 'Graded' FROM mdl_course AS c JOIN mdl_context AS ctx ON c.id = ctx.instanceid JOIN mdl_role_assignments AS ra ON ra.contextid = ctx.id JOIN mdl_user AS u ON u.id = ra.userid JOIN mdl_grade_grades AS gg ON gg.userid = u.id JOIN mdl_grade_items AS gi ON gi.id = gg.itemid JOIN mdl_course_categories AS cc ON cc.id = c.category WHERE (gi.itemname LIKE '%Pre-Test%' OR gi.itemname LIKE'%Post-Test%') AND (gg.timemodified IS NOT NULL) AND (gi.courseid = c.id) ORDER BY Graded ASC, Last ASC, Course ASC";
  } else if (reportType == "fullmetrics") {
    
    // TODO: Create db query that is fit for finding all the needed common metrics

    return "SELECT * FROM mdl_user;";
  
  } else {
    return null;
  }
}

function queryDB(query){
  var data;
  
  onnection.connect(function(err){
    if (err) throw err;
  });

  connection.query(query, function(err, results, feilds){
      if(err) throw err;
      data = results;
  });

  connection.end();

  return data;
}

function filterResults(fromDate, toDate, results){
  // TODO: Remove any results that reside outside the user's selected date range
  // TODO: Check for errors in the selected date range and output accordingly
}

function runAnalysis(results, reportType){
  if (reportType == "audit") {
    return auditEnrollmentAnalysis(results);
  
  } else if (reportType == "grade") {
    return gradeAnalysis(results);

  } else if (reportType == "feedback") {
    return feedbackAnalysis(results);
  
  } else if (reportType == "fullmetrics") {
    return fullMetricAnalysis(results);
  }
}

function auditEnrollmentAnalysis(data) {
  // TODO: Sum the total number of students auditing each course
  return data;
}

function gradeAnalysis(data) {
  // TODO: For each class, calculate the aggregate grade of both pre-tests, and post-tests
  return data;
}

function feedbackAnalysis(data) {
  // TODO: For each class, calculate the aggregate score for each course's student evaluation
  return data;
}

function fullMetricAnalysis(data) {
  // TODO: Find out what feilds are needed to be aggregated in total for the full metrics
  // TODO: After getting the needed information, calculate the needed statistics
  return data;
}



// CLASS PUBLIC FUNCTIONS
module.exports.getReport = function(fromDate, toDate, reportType, callback){
  var query = getQuery(reportType);

  if (query) { 
    var results = queryDB(query);
    results = filterResults(fromDate, toDate, results);
      
      if (results) {
        var data = runAnalysis(results, reportType);
        var report = {data: data}
        callback(null, report);
      
      } else {
        var err = new Error('Invalid Date Range');
        results = "There was an error, please try again";
        callback(err, results);
      }

  } else {
    var err = new Error('Invalid Report Type');
    var results = "There was an error, plase try again";
    callback(err, results);
  }
}

module.exports.customReport = function(fromDate, toDate, tables, callback){
  // TODO: Process a custom query somehow
  var results = "There is nothing here yet";
  callback(null, results);
}

module.exports.showFullData = function(fromDate, toDate, reportType, callback){
  // TODO: Create process for loading all the requested data in a usable way
  var results = "Nothing so far";
  callback(null, results);
}