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

connection.connect(function(err){
  if (err) throw err;
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
    course.preAverage = getAvg(course.preScores).toFixed(2);
  
  } else if (regexMatch(curCourse.itemName, '*ost*est*')){
    course.postScores.push(curCourse.grade);
    course.postTestCount = course.postScores.length;
    course.postMax = course.postScores.max();
    course.postMin = course.postScores.max();
    course.postAverage = getAvg(course.postScores).toFixed(2);
  }

  return course;
}

function getFbQType(question, label){
  if (regexMatch(label, '*agree*')){
    question.qType = "Rank";
    question.responses = {"Strongly Disagree": 0, "Disagree": 0, "Neutral": 0, "Agree": 0, "Strongly Agree": 0};
  
  } else if (label.includes('true') || label.includes('false') || label.includes('True') || label.includes('False')){ // for some reason the regex wasn't picking up on this
    question.qType = "TrueFalse";
    question.responses = {"True": 0, "False": 0};
  
  } else {
    question.qType = "FreeResponse";
    question.responses = [];
  }

  return question;
}

function feedbackProcessing(question, curQuestion){
  question = answerProcessing(question, curQuestion);
  question.numResponses += 1;
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

    question.avgResponse = getAverageFbRanked(question); 

  } else if (question.qType == "TrueFalse"){
    if (curQuestion.response == '1') {
      question.responses["True"] += 1;
    } else if (curQuestion.response == '2'){
      question.responses["False"] += 1;
    }

    question.avgResponse = getAverageFbTF(question);

  } else {
      question.responses.push(curQuestion.response);
  }

  return question;
}

function getAverageFbRanked(question){
  // Takes weighted average of each category
  var cat = question.responses;
  var ttlResponses = question.numResponses;
  var strongDisMult = 1;
  var disMult = 2;
  var neuMult = 3;
  var agrMult = 4;
  var strongAgrMult = 5;
  var strongDis = cat["Strongly Disagree"];
  var dis = cat["Disagree"];
  var neu = cat["Neutral"];
  var agr = cat["Agree"];
  var strongAgr = cat["Strongly Agree"];
  return ( ((strongDisMult) * (strongDis/ttlResponses)) +
           ((disMult) * (dis/ttlResponses)) +
           ((neuMult) * (neu/ttlResponses)) +
           ((agrMult) * (agr/ttlResponses)) +
           ((strongAgrMult) * (strongAgr/ttlResponses)) ).toFixed(2);
}

function getAverageFbTF(question){
  var ttlResponses = question.numResponses;
  var numTrue = question.responses["True"];
  var numFalse = question.responses["False"];
  var percentTrue = (((numTrue) /ttlResponses) * 100).toFixed(2);
  var percentFalse = (((numFalse) /ttlResponses) * 100).toFixed(2);
  return {"True": percentTrue, "False": percentFalse};
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

  function courseCounter(name){
    this.name = name;
    this.count = 0;
  }

  for (var i = 0; i < data.length; i++){
    var currentCourse = data[i].courseName;

    if (!course){
      var course = new courseCounter(currentCourse);
      course.count += 1;
    } else if (course.name == currentCourse) {
      course.count += 1;
    } else {
      coursesList.push(course);
      course = new courseCounter(currentCourse);
      course.count = 1;
    }
  }
  
  // Add Last course not covered by loop
  course.count += 1;
  coursesList.push(course);

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

  function ACF(name, id) { //ACF = Aggregate Course Feedback; For each course compile all question objects
    this.name = name;
    this.id = id;
    this.fbQs =[];
    this.fbQIds = [];
  }

  function AQR(fbSetId, questionId, question){ // AQR = Aggregate Question Responses; For each question, record all responses
    this.setId = fbSetId;
    this.id = questionId;
    this.question = question;
    this.qType = '';
    this.responses;
    this.numResponses = 0;
    this.avgResponse = 0;
  }

  for (var i = 0; i < data.length; i++){
    var curQuestion = data[i];

    if (courseids.indexOf(curQuestion.courseId) < 0) { // If the course does not yet exist, create a new course
      var course = new ACF(curQuestion.courseName, curQuestion.courseId); // Make course and question objects
      var question = new AQR(curQuestion.courseFbSetId, curQuestion.questionId, curQuestion.question);
      
      courseids.push(course.id); // Add course and question ids to global list of known ids
      questionids.push(question.id);
      course.fbQIds.push(question.id); // Add question ids to list of known ids related to the course
      question = getFbQType(question, curQuestion.label); // Create the proper response collection points
      question = feedbackProcessing(question, curQuestion); // Process the question data
      course.fbQs.push(question);
      coursesList.push(course); // Push the course object to list of courses

    } else if ((course.id != curQuestion.courseId) && (courseids.indexOf(curQuestion.courseId) > 0)) { // If the course does exist, but isn't sequencial
      var id = curQuestion.courseId;
      var course = coursesList.find(c => c.id === id); // Set course object to the current question's course

      if (course.fbQIds.indexOf(curQuestion.questionId) < 0){ // if the question is new to the course
        var question = new AQR(curQuestion.courseFbSetId, curQuestion.questionId, curQuestion.question);
        questionids.push(question.id);
        course.fbQIds.push(question.id);
        question = getFbQType(question, curQuestion.label); // create the proper response collection points
        question = feedbackProcessing(question, curQuestion); // Process the question data
        course.fbQs.push(question);
      
      } else if ((question.id != curQuestion.questionId) && (course.fbQIds.indexOf(curQuestion.questionId) > 0)) { // If the question exists to the course but isn't sequencial
        var qid = curQuestion.questionId;
        var question = course.fbQs.find(q => q.id === qid); // Set question object to the current found question in the course
        question = feedbackProcessing(question, curQuestion); // Proecess the question data
        
      } else { // Question is known and sequencial
        question = feedbackProcessing(question, curQuestion); // Proecess the question data
      }

    } else if (course.id === curQuestion.courseId) { // Course is known and sequencial

      if (course.fbQIds.indexOf(curQuestion.questionId) < 0){ // if the question is new to the course
        var question = new AQR(curQuestion.courseFbSetId, curQuestion.questionId, curQuestion.question);
        questionids.push(question.id);
        course.fbQIds.push(question.id);
        question = getFbQType(question, curQuestion.label); // create the proper response collection points
        question = feedbackProcessing(question, curQuestion); // Process the question data
        course.fbQs.push(question);
      
      } else if ((question.id != curQuestion.questionId) && (course.fbQIds.indexOf(curQuestion.questionId) > 0)) { // If the question exists to the course but isn't sequencial
        var qid = curQuestion.questionId;
        var question = course.fbQs.find(q => q.id === qid); // Set question object to the current found question in the course
        question = feedbackProcessing(question, curQuestion); // Proecess the question data
        
      } else { // Question is known and sequencial
        question = feedbackProcessing(question, curQuestion); // Proecess the question data
      }

    }

  }
  return coursesList;
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






