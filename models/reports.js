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

function feedbackProcessing(question, curQuestion){
  question = getFbQType(question, curQuestion.label);
  question = answerProcessing(question, curQuestion);
  question.numReponses += 1;
  return question;
}

function getFbQType(question, label){
  if (regexMatch(question.label, '*trongly*issagree*trongly*gree*')){
    question.qType = "Rank";
    question.responses = {"Strongly Disagree": 0, "Disasgree": 0, "Neutral": 0, "Agree": 0, "Strongly Agree": 0};
  
  } else if (regexMatch(question.label, '*rue*alse*')){
    question.qType = "TrueFalse";
    question.responses = {"True": 0, "False": 0};
  
  } else {
    question.qType = "FreeResponse";
    question.responses = [];
  }

  return question;
}

function answerProcessing(question, curQuestion){
  
  if (question.qType == "Rank"){

    if (curQuestion.response == '1'){
      question.responses["Strongly Disagree"] += 1;
    } else if (curQuestion.response == '2') {
      question.responses["Disagree"] += 1;
    } else if (curQuestion.response == '3') {
      question.responses["Neutral"] += 1;
    } else if (curQuestion.response == '4') {
      question.responses["Agree"] += 1;
    } else if (curQuestion.response == '5') {
      question.responses["Strongly Agree"] += 1;
    } 

  } else if (question.qType == "TrueFalse"){
    
    if (curQuestion.response == '1') {
      question.responses["True"] += 1;
    } else if (curQuestion.response == '2'){
      question.responses["False"] += 1;
    }

  } else {
    question.responses.push({curQuestion.submissionId: curQuesiton.repsonse});
  }

  return question;
}

function getQuery(reportType){
  if (reportType == "audit") {
    return "SELECT c.fullname AS 'courseName', g.name AS 'groupName', gm.userid AS 'userID', FROM_UNIXTIME(gm.timeadded, '%c-%d-%Y') AS 'timeAdded' FROM mdl_groups g  JOIN mdl_groups_members AS gm ON g.id = gm.groupid JOIN mdl_course AS c ON g.courseid = c.id WHERE (g.name LIKE '%udit%')";
  
  } else if (reportType == "feedback") {

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
    this.name = name;
    this.id = id;
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
  var questionids = [];

  function AggregateCourseFeedback(name, id) { // For each course compile all question objects
    this.name = name;
    this.id = id;
    this.fbSets = [{"SetId": ["questionObject1", "questionObject2", ...]}];
    this.fbQIds = [];
    this.responses = [];
    this.repsonseData = [];
  }

  function AggregateQuestionRepsonses(fbSetId, questionId, question){ // For each question, record all responses
    this.setId = fbSetId;
    this.questionId = questionId;
    this.question = question;
    this.qType = '';
    this.responses;
    this.numResponses = 0;
    this.avgResponse = 0;
  }



  for (var i = 0; i < data.length; i++){
    var curQuestion = data[i];

    if (courseids.indexOf(curQuestion.courseId) < 0) { // Make sure class does not exist yet
      var course = new AggregateCourseFeedback(curQuestion.courseName, curQuestion.courseId);
      var question = new AggregateQuestionResponses(curQuestion.courseFbSetId, curQuestion.questionId, curQuestion.question);
      courseids.push(course.id);
      questionids.push(question.id);

    
      course.fbQIds.push(question.questionId);
      course.fbSets.push({question.fbSetId: []})
      
      question = feedbackProcessing(question, curQuestion);
      

      coursesList.push(course);
      course.fbSets[question.fbSetId].push({question.questionId: question});
  

    } else if ((course.id != curCourse.courseId) && (courseids.indexOf(curCourse.courseId) > 0)) {


      if (fbQsSeenIds.indexOf({"courseId": course.id, "fbSetId": curQuestion.courseFbSetId, "qId": curQuestion.questionId}) < 0) {
        var question = new AggregateQuestionResponses(curQuestion.courseFbSetId, curQuestion.questionId, curQuestion.question);
        fbQsSeenIds.push({"courseId": course.id, "fbSetId": question.fbSetId, "qId": question.questionId});
        course.fbQIds.push(question.questionId);
        
        question = feedbackProcessing(question, curQuestion);
        
      } else if {
        
      }

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






