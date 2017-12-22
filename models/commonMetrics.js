var mysql = require('mysql');
var async = require('async');
require('datejs');
require('dotenv').config();
var xl = require('excel4node');
var mongoose = require('mongoose');
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

var questionResponseSchema = new Schema({
  question: {
    type: String,
  },

  numStrongDis: {
    type: Number,
    default: 0
  },

  percentStrongDis: {
    type: Number,
    default: 0
  },

  numDis: {
    type: Number,
    default: 0
  },

  percentDis: {
    type: Number,
    default: 0
  },

  numNeutral: {
    type: Number,
    default: 0
  },

  percentNeutral: {
    type: Number,
    default: 0
  },

  numAgree: {
    type: Number,
    default: 0
  },

  percentAgree: {
    type: Number,
    default: 0
  },

  numStrongAgree: {
    type: Number,
    default: 0
  },

  percentStrongAgree: {
    type: Number,
    default: 0
  },

  numTotal: {
    type: Number,
    default: 0
  },

  itemPresent: {
    type: Boolean,
    default: false
  }
});

var questionResponse = mongoose.model('questionResponse', questionResponseSchema);

var cmCourseSchema = new Schema({
  courseId: {
    type: Number,
    default: 0
  }, 

  courseName: {
    type: String,
    default: "None"
  },

  lps: {
    type: String,
    default: "None"
  },

  reportingPeriodFrom: {
    type: Date,
    default: new Date()
  },

  reportingPeriodTo: {
    type: Date,
    default: new Date()
  },

  dateOfTraining: {
    type: Date,
    default: new Date()
  },

  contactName: {
    type: String,
    default: "John Doe"
  },

  durationHours: {
    type: Number,
    default: 0
  },

  numTimesOffered: {
    type: Number,
    default: 0
  },

  deliveryMode: {
    type: String,
    default: "None"
  },

  primaryCompetency: {
    type: String,
    default: "None"
  },

  numTrained: {
    type: Number,
    default: 0
  },

  numResponses: {
    type: Number,
    default: 0
  },

  courseDataCompleted: {
    type: Boolean,
    default: false
  },

  timeStamp: {
    type: Date
  },

  subjectMatter: questionResponseSchema,

  actionsToApply: questionResponseSchema,

  clearlyPresented: questionResponseSchema,

  overallSatisfaction: questionResponseSchema,

  learningObejectivesMet: questionResponseSchema
});

var CmCourse = module.exports =  mongoose.model('CmCourse', cmCourseSchema);

function regexMatch(str, rule){ return new RegExp("^" + rule.split("*").join(".*") + "$").test(str);
}

function queryDB(query, callback){
  var data;
  connection.query(query, function(err, results, feilds){
      if(err) throw err;
      callback(null, results);
  }); 
}

function getQuery(queryType, courseid){
  if (queryType == "feedbackData"){
    return "SELECT c.fullname AS 'courseName', fb.course AS 'courseId', fb.id AS 'courseFbSetId', fbc.id AS 'submissionId', FROM_UNIXTIME(fbc.timemodified, '%Y-%m-%d') AS 'dateTime', fbc.userid AS 'userId', fbi.id AS 'questionId', fbi.name AS 'question', fbi.presentation AS 'label', fbv.value AS 'response' FROM mdl_feedback as fb JOIN mdl_feedback_item AS fbi ON fb.id = fbi.feedback JOIN mdl_feedback_value AS fbv ON fbi.id = fbv.item JOIN mdl_feedback_completed AS fbc ON fbv.completed = fbc.id JOIN mdl_course AS c ON fb.course = c.id ORDER BY fb.id, CourseId;";
  } else if (queryType == "enrolleeData") {
    return "SELECT ue.timestart, e.courseid FROM mdl_user_enrolments AS ue JOIN mdl_enrol AS e ON ue.enrolid = e.id JOIN mdl_course AS c ON e.courseid = c.id WHERE courseid = " + courseid + ";";
  }
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

function feedbackAnalysis(data){
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
    this.responses = '';
    this.numResponses = 0;
    this.avgResponse = 0;
  }

  for (var i = 0; i < data.length; i++){

    var curQuestion = data[i];

    if (relevantQuestion(curQuestion.question)){

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
  }

  return coursesList;
}

function getFbQType(question, label){
  if (regexMatch(label, '*agree*')){
    question.qType = "Rank";
    question.responses = {stronglyDisagree: 0, disagree: 0, neutral: 0, agree: 0, stronglyAgree: 0};
  
  } else if (label.includes('true') || label.includes('false') || label.includes('True') || label.includes('False')){ // for some reason the regex wasn't picking up on this
    question.qType = "TrueFalse";
    question.responses = {positive: 0, negative: 0};
  
  } else {
    question.qType = "FreeResponse";
    question.responses = [];
  }

  return question;
}

function relevantQuestion(question){

  var comMetQs = {
    q1: "*ubject*atter*",
    q2: "*dentified*ctions*",
    q3: "*nformation*resented*learly*",
    q4: "*atisfied*verall*", 
    q5: "*earning*bjectives*",
  };


  if (regexMatch(question, comMetQs.q1) || regexMatch(question, comMetQs.q2) || regexMatch(question, comMetQs.q3) || regexMatch(question, comMetQs.q4) || regexMatch(question, comMetQs.q5)){
    return true;
  } else {
    return false;
  }
}

function feedbackProcessing(question, curQuestion){
  question = answerProcessing(question, curQuestion);
  question.numResponses += 1;
  return question;
}

function answerProcessing(question, curQuestion){
  
  if (question.qType == "Rank"){
    if (curQuestion.response == '1'){
      question.responses.stronglyDisagree += 1;
    } else if (curQuestion.response == '2') {
      question.responses.disagree += 1;
    } else if (curQuestion.response == '3') {
      question.responses.neutral += 1;
    } else if (curQuestion.response == '4') {
      question.responses.agree+= 1;
    } else if (curQuestion.response == '5') {
      question.responses.stronglyAgree += 1;
    } 

    question.avgResponse = getAverageFbRanked(question); 

  } else if (question.qType == "TrueFalse"){ // Changed to positive and negative because of the weak handlebars engine
    if (curQuestion.response == '1') {
      question.responses.positive += 1;
    } else if (curQuestion.response == '2'){
      question.responses.negative += 1;
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
  
  var strongDis = cat.stronglyDisagree;
  var dis = cat.disagree;
  var neu = cat.neutral;
  var agr = cat.agree;
  var strongAgr = cat.stronglyAgree;

  var average = (
           ((strongDisMult) * (strongDis/ttlResponses)) +
           ((disMult) * (dis/ttlResponses)) +
           ((neuMult) * (neu/ttlResponses)) +
           ((agrMult) * (agr/ttlResponses)) +
           ((strongAgrMult) * (strongAgr/ttlResponses))
      ).toFixed(2);
  
  if (average == NaN || average == null) {
    return 0;
  } else {
    return average;
  }
}

function getAverageFbTF(question){
  var ttlResponses = question.numResponses;
  var numTrue = question.responses.positive;
  var numFalse = question.responses.negative;
  var percentTrue = (((numTrue) /ttlResponses) * 100).toFixed(2);
  var percentFalse = (((numFalse) /ttlResponses) * 100).toFixed(2);
  return {positive: percentTrue, negative: percentFalse};
}

function parseCourseObject(course, curCourse, fromDate, toDate, timeStampNow, callback){

  var comMetQs = {
    q1: "*ubject*atter*",
    q2: "*dentified*ctions*",
    q3: "*nformation*resented*learly*",
    q4: "*atisfied*verall*", 
    q5: "*earning*bjectives*",
  };

  course.courseId = curCourse.id;
  course.courseName = curCourse.name;
  course.reportingPeriodFrom = fromDate;
  course.reportingPeriodTo = toDate;
  course.timeStamp = timeStampNow;
  course.numResponses = curCourse.numResponses;
  course.subjectMatter = new questionResponse();
  course.actionsToApply = new questionResponse();
  course.clearlyPresented = new questionResponse();
  course.overallSatisfaction = new questionResponse();
  course.learningObejectivesMet = new questionResponse();
  
  for (var j = 0; j < curCourse.fbQs.length; j++) {
    var fbQ = curCourse.fbQs[j];
     
    if (regexMatch(fbQ.question, comMetQs.q1)){
      
      course.subjectMatter = [{
        itemPresent: true,
        question: fbQ.question,
        numStrongDis: fbQ.responses.stronglyDisagree,
        percentStrongDis: Number(Math.round((fbQ.responses.stronglyDisagree / fbQ.numResponses)+'e2')+'e-2'),
        numDis: fbQ.responses.disagree,
        percentDis: Number(Math.round((fbQ.responses.disagree / fbQ.numResponses)+'e2')+'e-2'),
        numNeutral: fbQ.responses.neutral,
        percentNeutral: Number(Math.round((fbQ.responses.neutral / fbQ.numResponses)+'e2')+'e-2'),
        numAgree: fbQ.responses.agree,
        percentAgree: Number(Math.round((fbQ.responses.agree / fbQ.numResponses)+'e2')+'e-2'),
        numStrongAgree: fbQ.responses.stronglyAgree,
        percentStrongAgree: Number(Math.round((fbQ.responses.stronglyAgree / fbQ.numResponses)+'e2')+'e-2'),
        numTotal: fbQ.numResponses
      }];
     
     } else if (regexMatch(fbQ.question, comMetQs.q2)){
      
      course.actionsToApply = [{
        itemPresent: true,
        question: fbQ.question,
        numStrongDis: fbQ.responses.stronglyDisagree,
        percentStrongDis: Number(Math.round((fbQ.responses.stronglyDisagree / fbQ.numResponses)+'e2')+'e-2'),
        numDis: fbQ.responses.disagree,
        percentDis: Number(Math.round((fbQ.responses.disagree / fbQ.numResponses)+'e2')+'e-2'),
        numNeutral: fbQ.responses.neutral,
        percentNeutral: Number(Math.round((fbQ.responses.neutral / fbQ.numResponses)+'e2')+'e-2'),
        numAgree: fbQ.responses.agree,
        percentAgree: Number(Math.round((fbQ.responses.agree / fbQ.numResponses)+'e2')+'e-2'),
        numStrongAgree: fbQ.responses.stronglyAgree,
        percentStrongAgree: Number(Math.round((fbQ.responses.stronglyAgree / fbQ.numResponses)+'e2')+'e-2'),
        numTotal: fbQ.numResponses
      }];

     } else if (regexMatch(fbQ.question, comMetQs.q3)){
      
      course.clearlyPresented = [{
        itemPresent: true,
        question: fbQ.question,
        numStrongDis: fbQ.responses.stronglyDisagree,
        percentStrongDis: Number(Math.round((fbQ.responses.stronglyDisagree / fbQ.numResponses)+'e2')+'e-2'),
        numDis: fbQ.responses.disagree,
        percentDis: Number(Math.round((fbQ.responses.disagree / fbQ.numResponses)+'e2')+'e-2'),
        numNeutral: fbQ.responses.neutral,
        percentNeutral: Number(Math.round((fbQ.responses.neutral / fbQ.numResponses)+'e2')+'e-2'),
        numAgree: fbQ.responses.agree,
        percentAgree: Number(Math.round((fbQ.responses.agree / fbQ.numResponses)+'e2')+'e-2'),
        numStrongAgree: fbQ.responses.stronglyAgree,
        percentStrongAgree: Number(Math.round((fbQ.responses.stronglyAgree / fbQ.numResponses)+'e2')+'e-2'),
        numTotal: fbQ.numResponses
      }];

     } else if (regexMatch(fbQ.question, comMetQs.q4)){
      
      course.overallSatisfaction = [{
        itemPresent: true,
        question: fbQ.question,
        numStrongDis: fbQ.responses.stronglyDisagree,
        percentStrongDis: Number(Math.round((fbQ.responses.stronglyDisagree / fbQ.numResponses)+'e2')+'e-2'),
        numDis: fbQ.responses.disagree,
        percentDis: Number(Math.round((fbQ.responses.disagree / fbQ.numResponses)+'e2')+'e-2'),
        numNeutral: fbQ.responses.neutral,
        percentNeutral: Number(Math.round((fbQ.responses.neutral / fbQ.numResponses)+'e2')+'e-2'),
        numAgree: fbQ.responses.agree,
        percentAgree: Number(Math.round((fbQ.responses.agree / fbQ.numResponses)+'e2')+'e-2'),
        numStrongAgree: fbQ.responses.stronglyAgree,
        percentStrongAgree: Number(Math.round((fbQ.responses.stronglyAgree / fbQ.numResponses)+'e2')+'e-2'),
        numTotal: fbQ.numResponses
      }];

     } else if (regexMatch(fbQ.question, comMetQs.q5)){
      
      course.learningObejectivesMet = [{
        itemPresent: true,
        question: fbQ.question,
        numStrongDis: fbQ.responses.stronglyDisagree,
        percentStrongDis: Number(Math.round((fbQ.responses.stronglyDisagree / fbQ.numResponses)+'e2')+'e-2'),
        numDis: fbQ.responses.disagree,
        percentDis: Number(Math.round((fbQ.responses.disagree / fbQ.numResponses)+'e2')+'e-2'),
        numNeutral: fbQ.responses.neutral,
        percentNeutral: Number(Math.round((fbQ.responses.neutral / fbQ.numResponses)+'e2')+'e-2'),
        numAgree: fbQ.responses.agree,
        percentAgree: Number(Math.round((fbQ.responses.agree / fbQ.numResponses)+'e2')+'e-2'),
        numStrongAgree: fbQ.responses.stronglyAgree,
        percentStrongAgree: Number(Math.round((fbQ.responses.stronglyAgree / fbQ.numResponses)+'e2')+'e-2'),
        numTotal: fbQ.numResponses
      }];

    }
  }

  var query = getQuery("enrolleeData", course.courseId);
  if (query){
    queryDB(query, function(err, results){

      for (var m = 0; m < results.length; m++){
        var enrollDate = new Date(results.timestart);
        if (enrollDate >= (new Date(fromDate)) ){
          course.numTrained += 1;
        }
      }
      callback(null, course);
    });

  } else {
    course.numTrained = 0;
    callback(null, course);
  }
}

function validateData(course){ // Some questions are not present in the database

  if (course.subjectMatter.itemPresent == false) {
    course.subjectMatter.numStrongDis = -1;
    course.subjectMatter.percentStrongDis = -1;
    course.subjectMatter.numDis = -1;
    course.subjectMatter.percentDis = -1;
    course.subjectMatter.numNeutral = -1;
    course.subjectMatter.percentNeutral = -1;
    course.subjectMatter.numAgree = -1;
    course.subjectMatter.percentAgree = -1;
    course.subjectMatter.numStrongAgree = -1;
    course.subjectMatter.percentStrongAgree = -1;
    course.subjectMatter.numTotal = -1;
  }

  if (course.actionsToApply.itemPresent == false) {
    course.actionsToApply.numStrongDis = -1;
    course.actionsToApply.percentStrongDis = -1;
    course.actionsToApply.numDis = -1;
    course.actionsToApply.percentDis = -1;
    course.actionsToApply.numNeutral = -1;
    course.actionsToApply.percentNeutral = -1;
    course.actionsToApply.numAgree = -1;
    course.actionsToApply.percentAgree = -1;
    course.actionsToApply.numStrongAgree = -1;
    course.actionsToApply.percentStrongAgree = -1;
    course.actionsToApply.numTotal = -1;
  }

  if (course.overallSatisfaction.itemPresent == false) {
    course.overallSatisfaction.numStrongDis = -1;
    course.overallSatisfaction.percentStrongDis = -1;
    course.overallSatisfaction.numDis = -1;
    course.overallSatisfaction.percentDis = -1;
    course.overallSatisfaction.numNeutral = -1;
    course.overallSatisfaction.percentNeutral = -1;
    course.overallSatisfaction.numAgree = -1;
    course.overallSatisfaction.percentAgree = -1;
    course.overallSatisfaction.numStrongAgree = -1;
    course.overallSatisfaction.percentStrongAgree = -1;
    course.overallSatisfaction.numTotal = -1;
  }

  if (course.clearlyPresented.itemPresent == false) {
    course.clearlyPresented.numStrongDis = -1;
    course.clearlyPresented.percentStrongDis = -1;
    course.clearlyPresented.numDis = -1;
    course.clearlyPresented.percentDis = -1;
    course.clearlyPresented.numNeutral = -1;
    course.clearlyPresented.percentNeutral = -1;
    course.clearlyPresented.numAgree = -1;
    course.clearlyPresented.percentAgree = -1;
    course.clearlyPresented.numStrongAgree = -1;
    course.clearlyPresented.percentStrongAgree = -1;
    course.clearlyPresented.numTotal = -1;
  }

  if (course.learningObejectivesMet.itemPresent == false) {
    course.learningObejectivesMet.numStrongDis = -1;
    course.learningObejectivesMet.percentStrongDis = -1;
    course.learningObejectivesMet.numDis = -1;
    course.learningObejectivesMet.percentDis = -1;
    course.learningObejectivesMet.numNeutral = -1;
    course.learningObejectivesMet.percentNeutral = -1;
    course.learningObejectivesMet.numAgree = -1;
    course.learningObejectivesMet.percentAgree = -1;
    course.learningObejectivesMet.numStrongAgree = -1;
    course.learningObejectivesMet.percentStrongAgree = -1;
    course.learningObejectivesMet.numTotal = -1;
  }

  return course;
}

module.exports.createCourses = function(fromDate, toDate, callback){
    var query = getQuery("feedbackData");
    var results;
    
    if (query) { 
      queryDB(query, function(err, results){
        if (err) throw err;
        
        results = filterResults(fromDate, toDate, results);
        
        if (results) {
          results = feedbackAnalysis(results);
          var timeStampNow = new Date();
          
          var i = 0;
          async.eachSeries(results, function(course, next) {
            course = new CmCourse();
            parseCourseObject(course, results[i], fromDate, toDate, timeStampNow, function(err, data){
              course = data;
              course.position = i;
              course.save(function(err, results){
                i++;
                next();
              });
            });
          }, function(err) {
            if (err) throw err;
            CmCourse.remove({timeStamp: {$ne: timeStampNow}}, function(err, results){
              if (err) throw err;
              callback(null, results);
            });
          });
        
        } else {
          err = new Error('Invalid Date Range');
          results = "There was an error, please try again";
          callback(err, results);
        }
      });
    
    } else {
      var err = new Error('Invalid Report Type');
      results = "There was an error, plase try again";
      callback(err, results);
    }
};

module.exports.getOneCourse = function(courseName, courseId, callback){
  CmCourse.find({courseName: courseName, courseId: courseId}, function(err, course){
    if (err) throw err;
    callback(null, course);
  });
};

module.exports.updateCourse = function(course, formData, callback){

  var courseInfo = {
    lps: formData.cmlps,
    dateOfTraining: formData.cmdateoftraining,
    contactName: formData.cmcontactname,
    durationHours: formData.cmdurhours,
    numTimesOffered: formData.cmnumtimesoffered,
    deliveryMode: formData.cmdeliverymode,
    primaryCompetency: formData.cmprimarycomp,
    courseDataCompleted: true
  };

  CmCourse.update({courseName: course.courseName, courseId: course.courseId}, courseInfo, function(err, data){
    if (err) throw err;
    callback(null, data);
  });
};

module.exports.getCourses = function(callback){
  CmCourse.find({}, function(err, courses){
    if (err) throw err;
    callback(null, courses);
  });
};

module.exports.listCourses = function(callback){
  CmCourse.find({}, {courseName: 1, courseId: 1, courseDataCompleted: 1, reportingPeriodFrom: 1, reportingPeriodTo: 1,  _id: 1}, function(err, courses){
    if (err) throw err;
    callback(null, courses);
  });
};

module.exports.generateExcelFile = function(callback){
  CmCourse.find({}, function(err, courses){
    if (err) throw err;
    var wb = new xl.Workbook();
    var ws = wb.addWorksheet('Common Metrics Report');

    var styleRed = {
      font: {bold: true},
      alignment: {wrapText: true, horizontal: 'center'}, 
      fill: {type: 'pattern', patternType: 'solid', fgColor: 'F4CCCC'},
      border: {left: {style: 'thin', color: '000000'}, right: {style: 'thin', color: '000000'}, top: {style: 'thin', color: '000000'}, bottom: {style: 'thin', color: '000000'}}
    };

    var styleYellow = {
      font: {bold: true},
      alignment: {wrapText: true, horizontal: 'center'},
      fill: {type: 'pattern', patternType: 'solid', fgColor: 'FCE5CD'},
      border: {left: {style: 'thin', color: '000000'}, right: {style: 'thin', color: '000000'}, top: {style: 'thin', color: '000000'}, bottom: {style: 'thin', color: '000000'}}
    };

    var styleBlue = {
      font: {bold: true},
      alignment: {wrapText: true, horizontal: 'center'},
      fill: {type: 'pattern', patternType: 'solid', fgColor: 'DEEAF6'},
      border: {left: {style: 'thin', color: '000000'}, right: {style: 'thin', color: '000000'}, top: {style: 'thin', color: '000000'}, bottom: {style: 'thin', color: '000000'}}
    };

    var styleNoColorTitle = {
      font: {bold: true},
      alignment: {wrapText: true, horizontal: 'center'},
      border: {left: {style: 'thin', color: '000000'}, right: {style: 'thin', color: '000000'}, top: {style: 'thin', color: '000000'}, bottom: {style: 'thin', color: '000000'}}
    };

    var styleNoColorData = {
      alignment: {wrapText: true, horizontal: 'center'}
    };

    // Excel headers
      ws.cell(1, 1, 1, 4, true).string('Reporting Information').style(styleRed);
      ws.cell(1, 5, 1, 10, true).string('CourseInformation').style(styleYellow);
      ws.cell(1, 11, 1, 20, true).string('Q1: Subject Matter Understanding Improved').style(styleBlue);
      ws.cell(1, 21, 1, 30, true).string('Q2: Subject Matter Understanding Improved').style(styleBlue);
      ws.cell(1, 31, 1, 40, true).string('Q3: Subject Matter Understanding Improved').style(styleBlue);
      ws.cell(1, 41, 1, 50, true).string('Q4: Subject Matter Understanding Improved').style(styleBlue);
      ws.cell(1, 51, 1, 60, true).string('Q5: Subject Matter Understanding Improved').style(styleBlue);
      ws.cell(1, 61, 1, 62, true).string('Common Metrics Data Collected?').style(styleYellow);
      
      ws.cell(2, 1).string("Which LPS Organized Training?").style(styleRed);
      ws.cell(2, 2).string("Reporting Period").style(styleRed);
      ws.cell(2, 3).string("Full name we may contact about data").style(styleRed);
      ws.cell(2, 4).string("Date (Live Training Only)").style(styleRed);
      
      ws.cell(2, 5).string("Course Title").style(styleYellow);
      ws.cell(2, 6).string("Core Competency Domain").style(styleYellow);
      ws.cell(2, 7).string("Delivery Mode Used to Offer Course").style(styleYellow);
      ws.cell(2, 8).string("Duration of Course in Hours").style(styleYellow);
      ws.cell(2, 9).string("Total # Completing Course").style(styleYellow);
      ws.cell(2, 10).string("Total # Completing Evaluation").style(styleYellow);

      ws.cell(2, 11).string("# Strongly Disagree").style(styleBlue);
      ws.cell(2, 12).string("% Strongly Disagree").style(styleBlue);
      ws.cell(2, 13).string("# Disagree").style(styleBlue);
      ws.cell(2, 14).string("% Disagree").style(styleBlue);
      ws.cell(2, 15).string("# Neutral").style(styleBlue);
      ws.cell(2, 16).string("% Neutral").style(styleBlue);
      ws.cell(2, 17).string("# Agree").style(styleBlue);
      ws.cell(2, 18).string("% Agree").style(styleBlue);
      ws.cell(2, 19).string("# Strongly Agree").style(styleBlue);
      ws.cell(2, 20).string("% Strongly Agree").style(styleBlue);

      ws.cell(2, 21).string("# Strongly Disagree").style(styleNoColorTitle);
      ws.cell(2, 22).string("% Strongly Disagree").style(styleNoColorTitle);
      ws.cell(2, 23).string("# Disagree").style(styleNoColorTitle);
      ws.cell(2, 24).string("% Disagree").style(styleNoColorTitle);
      ws.cell(2, 25).string("# Neutral").style(styleNoColorTitle);
      ws.cell(2, 26).string("% Neutral").style(styleNoColorTitle);
      ws.cell(2, 27).string("# Agree").style(styleNoColorTitle);
      ws.cell(2, 28).string("% Agree").style(styleNoColorTitle);
      ws.cell(2, 29).string("# Strongly Agree").style(styleNoColorTitle);
      ws.cell(2, 30).string("% Strongly Agree").style(styleNoColorTitle);

      ws.cell(2, 31).string("# Strongly Disagree").style(styleBlue);
      ws.cell(2, 32).string("% Strongly Disagree").style(styleBlue);
      ws.cell(2, 33).string("# Disagree").style(styleBlue);
      ws.cell(2, 34).string("% Disagree").style(styleBlue);
      ws.cell(2, 35).string("# Neutral").style(styleBlue);
      ws.cell(2, 36).string("% Neutral").style(styleBlue);
      ws.cell(2, 37).string("# Agree").style(styleBlue);
      ws.cell(2, 38).string("% Agree").style(styleBlue);
      ws.cell(2, 39).string("# Strongly Agree").style(styleBlue);
      ws.cell(2, 40).string("% Strongly Agree").style(styleBlue);

      ws.cell(2, 41).string("# Strongly Disagree").style(styleNoColorTitle);
      ws.cell(2, 42).string("% Strongly Disagree").style(styleNoColorTitle);
      ws.cell(2, 43).string("# Disagree").style(styleNoColorTitle);
      ws.cell(2, 44).string("% Disagree").style(styleNoColorTitle);
      ws.cell(2, 45).string("# Neutral").style(styleNoColorTitle);
      ws.cell(2, 46).string("% Neutral").style(styleNoColorTitle);
      ws.cell(2, 47).string("# Agree").style(styleNoColorTitle);
      ws.cell(2, 48).string("% Agree").style(styleNoColorTitle);
      ws.cell(2, 49).string("# Strongly Agree").style(styleNoColorTitle);
      ws.cell(2, 50).string("% Strongly Agree").style(styleNoColorTitle);

      ws.cell(2, 51).string("# Strongly Disagree").style(styleBlue);
      ws.cell(2, 52).string("% Strongly Disagree").style(styleBlue);
      ws.cell(2, 53).string("# Disagree").style(styleBlue);
      ws.cell(2, 54).string("% Disagree").style(styleBlue);
      ws.cell(2, 55).string("# Neutral").style(styleBlue);
      ws.cell(2, 56).string("% Neutral").style(styleBlue);
      ws.cell(2, 57).string("# Agree").style(styleBlue);
      ws.cell(2, 58).string("% Agree").style(styleBlue);
      ws.cell(2, 59).string("# Strongly Agree").style(styleBlue);
      ws.cell(2, 60).string("% Strongly Agree").style(styleBlue);

      ws.cell(2, 61).string("Common Metrics Data Collected?").style(styleYellow);
      ws.cell(2, 62).string("If not, why?").style(styleYellow);
    
    var row = 3;
    
    for (var i = 0; i < courses.length; i++){
      var c = courses[i];
      course = validateData(course);

      ws.cell(row, 1).string(c.lps).style(styleNoColorData);
      ws.cell(row, 2).date(new Date(c.reportingPeriodFrom)).style(styleNoColorData);
      ws.cell(row, 3).string(c.contactName).style(styleNoColorData);
      ws.cell(row, 4).date(new Date(c.dateOfTraining)).style(styleNoColorData);
      ws.cell(row, 5).string(c.courseName);
      ws.cell(row, 6).string(c.primaryCompetency).style(styleNoColorData);
      ws.cell(row, 7).string(c.deliveryMode).style(styleNoColorData);
      ws.cell(row, 8).number(c.durationHours);
      ws.cell(row, 9).number(c.numTrained);
      ws.cell(row, 10).number(c.numResponses);

      ws.cell(row, 11).number(c.subjectMatter.numStrongDis);
      ws.cell(row, 12).number(c.subjectMatter.percentStrongDis);
      ws.cell(row, 13).number(c.subjectMatter.numDis);
      ws.cell(row, 14).number(c.subjectMatter.percentDis);
      ws.cell(row, 15).number(c.subjectMatter.numNeutral);
      ws.cell(row, 16).number(c.subjectMatter.percentNeutral);
      ws.cell(row, 17).number(c.subjectMatter.numAgree);
      ws.cell(row, 18).number(c.subjectMatter.percentAgree);
      ws.cell(row, 19).number(c.subjectMatter.numStrongAgree);
      ws.cell(row, 20).number(c.subjectMatter.percentStrongAgree);

      ws.cell(row, 21).number(c.actionsToApply.numStrongDis);
      ws.cell(row, 22).number(c.actionsToApply.percentStrongDis);
      ws.cell(row, 23).number(c.actionsToApply.numDis);
      ws.cell(row, 24).number(c.actionsToApply.percentDis);
      ws.cell(row, 25).number(c.actionsToApply.numNeutral);
      ws.cell(row, 26).number(c.actionsToApply.percentNeutral);
      ws.cell(row, 27).number(c.actionsToApply.numAgree);
      ws.cell(row, 28).number(c.actionsToApply.percentAgree);
      ws.cell(row, 29).number(c.actionsToApply.numStrongAgree);
      ws.cell(row, 30).number(c.actionsToApply.percentStrongAgree);

      ws.cell(row, 31).number(c.clearlyPresented.numStrongDis);
      ws.cell(row, 32).number(c.clearlyPresented.percentStrongDis);
      ws.cell(row, 33).number(c.clearlyPresented.numDis);
      ws.cell(row, 34).number(c.clearlyPresented.percentDis);
      ws.cell(row, 35).number(c.clearlyPresented.numNeutral);
      ws.cell(row, 36).number(c.clearlyPresented.percentNeutral);
      ws.cell(row, 37).number(c.clearlyPresented.numAgree);
      ws.cell(row, 38).number(c.clearlyPresented.percentAgree);
      ws.cell(row, 39).number(c.clearlyPresented.numStrongAgree);
      ws.cell(row, 40).number(c.clearlyPresented.percentStrongAgree);

      ws.cell(row, 41).number(c.overallSatisfaction.numStrongDis);
      ws.cell(row, 42).number(c.overallSatisfaction.percentStrongDis);
      ws.cell(row, 43).number(c.overallSatisfaction.numDis);
      ws.cell(row, 44).number(c.overallSatisfaction.percentDis);
      ws.cell(row, 45).number(c.overallSatisfaction.numNeutral);
      ws.cell(row, 46).number(c.overallSatisfaction.percentNeutral);
      ws.cell(row, 47).number(c.overallSatisfaction.numAgree);
      ws.cell(row, 48).number(c.overallSatisfaction.percentAgree);
      ws.cell(row, 49).number(c.overallSatisfaction.numStrongAgree);
      ws.cell(row, 50).number(c.overallSatisfaction.percentStrongAgree);

      ws.cell(row, 51).number(c.learningObejectivesMet.numStrongDis);
      ws.cell(row, 52).number(c.learningObejectivesMet.percentStrongDis);
      ws.cell(row, 53).number(c.learningObejectivesMet.numDis);
      ws.cell(row, 54).number(c.learningObejectivesMet.percentDis);
      ws.cell(row, 55).number(c.learningObejectivesMet.numNeutral);
      ws.cell(row, 56).number(c.learningObejectivesMet.percentNeutral);
      ws.cell(row, 57).number(c.learningObejectivesMet.numAgree);
      ws.cell(row, 58).number(c.learningObejectivesMet.percentAgree);
      ws.cell(row, 59).number(c.learningObejectivesMet.numStrongAgree);
      ws.cell(row, 60).number(c.learningObejectivesMet.percentStrongAgree);

      ws.cell(row, 61).bool(true).style(styleNoColorData);

      row += 1;
    }

    var fileName = "commonMetricsReport.xlsx";
    wb.write(fileName);
    callback(null, fileName);
  });
};
