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

// NEW ARRAY METHODS
Array.prototype.sum = function(){
  return this.reduce(function(a,b){
    return a+b;
  });
}

Array.prototype.min = function(){
  return this.reduce(function(a,b){
    return Math.min(a, b);
  });
}

Array.prototype.max = function(){
  return this.reduce(function(a,b){
    return Math.max(a, b);
  });
}

// FUNCTIONAL AIDS
function getAvg(arr){ return (arr.sum()/arr.length);
}

function regexMatch(str, rule){ return new RegExp("^" + rule.split("*").join(".*") + "$").test(str);
}

// PRIVATE FUNCTIONS
function regexAndScoreProcessing(course, curCourse){
  
  if (regexMatch(curCourse.itemName, '*re*est*')){ //Should really have better naming conventions for pre and post tests
    course.preScores.push(curCourse.grade);
    course.preTestCount = course.preScores.length;
    course.preMax = course.preScores.max();
    course.preMin = course.preScores.min();
    course.preAverage = getAvg(course.preScores);
  
  } else if (regexMatch(curCourse.itemName, '*ost*est*')){
    course.postScores.push(curCourse.grade);
    course.postTestCount = course.postScores.length;
    course.postMax = course.postScores.max();
    course.postMin = course.postScores.max();
    course.postAverage = getAvg(course.postScores);
  }

  return course;
}

function getQuery(reportType){
  if (reportType == "audit") {
    return "SELECT c.fullname AS 'courseName', g.name AS 'groupName', gm.userid AS 'userID', FROM_UNIXTIME(gm.timeadded, '%c-%d-%Y') AS 'timeAdded' FROM mdl_groups g  JOIN mdl_groups_members AS gm ON g.id = gm.groupid JOIN mdl_course AS c ON g.courseid = c.id WHERE (g.name LIKE '%udit%')";
  
  } else if (reportType == "feedback") {
    // return "SELECT fbc.id AS 'fbSubmissionId', c.id AS 'courseId', fbc.userid AS 'userId', FROM_UNIXTIME(fbc.timemodified, '%c-%d-%Y') AS 'timeSubmitted', c.fullname AS 'courseName', fbi.id AS 'fbItemId', fbi.name AS 'question', REPLACE(REPLACE(fbv.value, '\r', ''), '\n', '<br>') AS 'answer' FROM mdl_feedback_completed AS fbc JOIN mdl_feedback_value AS fbv ON fbc.id = fbv.completed JOIN mdl_feedback_item AS fbi ON fbv.item = fbi.id JOIN mdl_groups_members AS gm ON fbc.userid = gm.userid JOIN mdl_groups AS g ON gm.groupid = g.id JOIN mdl_course AS c ON g.courseid = c.id WHERE (g.name NOT LIKE '%Audit%' OR '%audit%') && (fbi.name LIKE'%understanding of the subject matter%' OR fbi.name LIKE '%identified actions%' OR fbi.name LIKE '%information was presented%' OR fbi.name LIKE'%I was satisfied with th%') ORDER BY fbSubmissionId, courseId, userId LIMIT 500;";

    return "SELECT c.fullname AS 'courseName', fb.course AS 'courseId', fb.id AS 'courseFbSetId', fbc.id AS 'submissionId', FROM_UNIXTIME(fbc.timemodified, '%Y-%m-%d') AS 'subDate', fbc.userid AS 'userId', fbi.id AS 'questionId', fbi.name AS 'question', fbi.presentation AS 'label', fbv.value AS 'response' FROM mdl_feedback as fb JOIN mdl_feedback_item AS fbi ON fb.id = fbi.feedback JOIN mdl_feedback_value AS fbv ON fbi.id = fbv.item JOIN mdl_feedback_completed AS fbc ON fbv.completed = fbc.id JOIN mdl_course AS c ON fb.course = c.id ORDER BY fb.id, CourseId LIMIT 500;";
  
  } else if (reportType == "grades") {
    return "SELECT u.id AS 'userId', c.id As 'courseId', c.fullname AS 'courseName', gi.itemname AS 'itemName', ROUND (gg.finalgrade, 2) AS 'grade', DATE_FORMAT(FROM_UNIXTIME(gg.timemodified), '%c-%d-%Y') AS 'graded' FROM mdl_course AS c JOIN mdl_context AS ctx ON c.id = ctx.instanceid JOIN mdl_role_assignments AS ra ON ra.contextid = ctx.id JOIN mdl_user AS u ON u.id = ra.userid JOIN mdl_grade_grades AS gg ON gg.userid = u.id JOIN mdl_grade_items AS gi ON gi.id = gg.itemid JOIN mdl_course_categories AS cc ON cc.id = c.category WHERE (gi.itemname LIKE '%re%est%' OR gi.itemname LIKE'%ost%est%') AND (gg.timemodified IS NOT NULL) AND (gi.courseid = c.id) ORDER BY graded ASC, userId ASC, courseName ASC";
  
  } else if (reportType == "fullmetrics") {
    
    // TODO: Create db query that is fit for finding all the needed common metrics

    return "SELECT * FROM mdl_user;";
  
  } else {
    return null;
  }
}

function queryDB(query, callback){
  var data;
  connection.connect(function(err){
    if (err) throw err;
  });

  connection.query(query, function(err, results, feilds){
      if(err) throw err;
      callback(null, results);
  }); 
}

function filterResults(fromDate, toDate, results){
  // TODO: Remove any results that reside outside the user's selected date range
  // TODO: Check for errors in the selected date range and output accordingly

  return results;
}

function runAnalysis(results, reportType){
  if (reportType == "audit") {
    return auditEnrollmentAnalysis(results);
  
  } else if (reportType == "grades") {
    return gradeAnalysis(results);

  } else if (reportType == "feedback") {
    return feedbackAnalysis(results);
  
  } else if (reportType == "fullmetrics") {
    return fullMetricAnalysis(results);
  }
}

function auditEnrollmentAnalysis(data){
  var coursesList = [];
  var course;
  var counter = 0;

  for (var i = 0; i < data.length; i++){
    var currentCourse = data[i].courseName;
    
    if (!course){
      course = currentCourse;
      counter += 1;
    } else if (course == currentCourse) {
      counter += 1;

    } else {
      coursesList[course] = counter;
      course = currentCourse;
      counter = 1;
    }

  }
  
  // Add Last course not covered by loop
  counter += 1;
  coursesList[course] = counter;

  // Return parsed results;
  return coursesList;
}

function gradeAnalysis(data) {
  // data is an arrary of objects each of which includes: userId, courseId, courseName, grade, and graded(as a date)
  var courseList = [];
  var courseids = [];
  var undeterminedObjects = [];

  function AggregateCourseGrades(name, id) { // Set up object ACG = Aggregate Course Grades object
    this.name = name,
    this.id = id, 
    this.preScores = [];
    this.postScores = [];
    this.preTestCount = 0;
    this.postTestCount = 0;
    this.preMax = 0;
    this.postMax = 0;
    this.preMin = 0;
    this.postMin = 0;
    this.preAverage = 0;
    this.postAverage = 0;
  };

  for (var i = 0; i < data.length; i++){ // Loop through each data object
    var curCourse = data[i]; 
    
    if (courseids.indexOf(curCourse.courseId) < 0) { // If the course id is not found in a list of known courses, create new ACG object      
      var course = new AggregateCourseGrades(curCourse.courseName, curCourse.courseId);
      courseids.push(course.id);
      courseList.push(course);
      course = regexAndScoreProcessing(course, curCourse);

    } else if ((course.id != curCourse.courseId) && (courseids.indexOf(curCourse.courseId) > 0)) { // If the aggregate course object already exists but isn't sequencial
      var id = course.id;
      var course = courseList.find( c => c.id === id);
      course = regexAndScoreProcessing(course, curCourse);

    } else if (course.id === curCourse.courseId) { // If already on the matching course object
      course = regexAndScoreProcessing(course, curCourse);
    }
  }

  data = {courses: courseList, undetermined: undeterminedObjects}
  return data;
}

function feedbackAnalysis(data) {
  var coursesList = [];
  var courseids = [];
  var fbSetSeenIds = [];

  function aggregateCourseFeedback(name, id) { // For each course compile all question objects
    this.name = name,
    this.id = id,
    this.fbSetIds = [],
    this.responses = []
    this.repsonseData = []
  }

  function AggregateQuestionRepsonses(fbSetId, questionId, question, label ){ // For each question, record all responses
    this.questionId = questionId,
    this.question = question,
    this.label = label,
    this.responses = [{submissionId: 0, responseId: 0, response: 0}],  // **** DELETE DUMMY DATA *****
    this.numResponses = 0,
    this.avgResponse = 0
  }



  for (var i = 0; i < data.length; i++){
    var curCourse = data[i];

    if (courseids.indexOf(curCourse.courseId) < 0) {


      var course = new AggregateCourseFeedback(curCourse.courseName, curCourse.courseId);
      coursesLists.push(course.id);
      
      course.fbSetIds.push(curCourse.courseFbSetId);
      fbSetSeenIds.push({"courseId": course.id, "fbSetId": curCourse.courseFbSetId});




    } else if ((course.id != curCourse.courseId) && (courseids.indexOf(curCourse.courseId) > 0)) {

    } else if (course.id === curCourse.courseId) { // If already on the matching course object
      
    }


  }


  debugger;
  return data;
}

function fullMetricAnalysis(data) {
  // TODO: Find out what feilds are needed to be aggregated in total for the full metrics
  // TODO: After getting the needed information, calculate the needed statistics
  return data;
}

//PUBLIC FUNCTIONS
module.exports.getReport = function(fromDate, toDate, reportType, callback){
  var query = getQuery(reportType);

  if (query) { 
    var results;
    
    queryDB(query, function(err, results){
      if (err) throw err;
      connection.end();
    
      results = filterResults(fromDate, toDate, results);
      
      if (results) {
        var data = runAnalysis(results, reportType);
        var report = {data: data, reportType: reportType};
        callback(null, report);
      
      } else {
        var err = new Error('Invalid Date Range');
        results = "There was an error, please try again";
        callback(err, results);
      }

    });
    
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






