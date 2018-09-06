var mysql = require('mysql');
var async = require('async');
require('datejs');
require('dotenv').config();
var xl = require('excel4node');
var mongoose = require('mongoose');
var UserReport = require('../models/userReports');
var Schema = mongoose.Schema;

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


function getQuery(){ 
    return "SELECT u.id AS 'userId', c.id As 'courseId', c.fullname AS 'courseName', gi.itemname AS 'itemName', ROUND (gg.finalgrade, 2) AS 'grade', DATE_FORMAT(FROM_UNIXTIME(gg.timemodified), '%Y-%m-%d') AS 'dateTime' FROM mdl_course AS c JOIN mdl_context AS ctx ON c.id = ctx.instanceid JOIN mdl_role_assignments AS ra ON ra.contextid = ctx.id JOIN mdl_user AS u ON u.id = ra.userid JOIN mdl_grade_grades AS gg ON gg.userid = u.id JOIN mdl_grade_items AS gi ON gi.id = gg.itemid JOIN mdl_course_categories AS cc ON cc.id = c.category WHERE (gi.itemname LIKE '%re%est%' OR gi.itemname LIKE'%ost%est%') AND (gg.timemodified IS NOT NULL) AND (gi.courseid = c.id) ORDER BY dateTime ASC, userId ASC, courseName ASC";
}

function filterResults(fromDate, toDate, results){
  var begDate = new Date(fromDate);
  var endDate = new Date(toDate);
  for (var i = 0; i < results.length; i++){
    var curDate = new Date(results[i].dateTime);
    if (begDate > curDate || curDate > endDate) {
      results.splice(i, 1);
      i = i - 1;
    }
  }
  return results;
}

function gradeAnalysis(data){
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

function getAvg(arr){ return (arr.sum()/arr.length);
}

function regexMatch(str, rule){ return new RegExp("^" + rule.split("*").join(".*") + "$").test(str);
}