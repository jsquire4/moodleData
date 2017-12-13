var mysql = require('mysql');
require('datejs');
require('dotenv').config();
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

var ehbCourseSchema = new Schema({
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

  approvedContEd: {
    type: Boolean,
    default: false
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

  partnerShips1: {
    type: String,
    default: "None"
  },

  partnerShips2: {
    type: String,
    default: "None"
  },

  partnerShips3: {
    type: String,
    default: "None"
  },

  partnerShips4: {
    type: String,
    default: "None"
  },

  locationDataAvail: {
    type: Boolean,
    default: false
  },

  numTrainedPrimaryCare: {
    type: Number,
    default: 0
  },

  numTrainedMedUnderServed: {
    type: Number,
    default: 0
  },

  numTrainedRural: {
    type: Number,
    default: 0
  },

  coursePrimaryTopicArea: {
    type: String,
    default: "None"
  },

  primaryCompetency: {
    type: String,
    default: "None"
  },

  competencyTier: {
    type: String,
    default: "None"
  },

  numTrained: {
    type: Number,
    default: 0
  },

  profession1: {
    type: String,
    default: "None"
  },

  numProf1: {
    type: Number,
    default: 0
  },

  profession2: {
    type: String,
    default: "None"
  },

  numProf2: {
    type: Number,
    default: 0
  },

  profession3: {
    type: String,
    default: "None"
  },

  numProf3: {
    type: Number,
    default: 0
  },

  profession4: {
    type: String,
    default: "None"
  },

  numProf4: {
    type: Number,
    default: 0
  },

  profession5: {
    type: String,
    default: "None"
  },

  numProf5: {
    type: Number,
    default: 0
  },

  profession6: {
    type: String,
    default: "None"
  },

  numProf6: {
    type: Number,
    default: 0
  },

  numProfOther: {
    type: Number,
    default: 0
  },

  courseDataCompleted: {
    type: Boolean,
    default: false
  }
});

var EhbCourse = module.exports =  mongoose.model('EhbCourse', ehbCourseSchema);

function getQuery(reportType){
  if (reportType == "ehbUsers") {
    return "SELECT u.firstname, u.lastname, uid.userid, uid.fieldid, uid.data, uif.name FROM mdl_user_info_data AS uid JOIN mdl_user_info_field AS uif ON uid.fieldid = uif.id JOIN mdl_user AS u ON uid.userid = u.id ORDER BY uid.userid ASC;";

  } else if (reportType == "ehbCourses") {
    return "SELECT e.courseid, DATE_FORMAT(FROM_UNIXTIME(ue.timestart), '%Y-%m-%d') AS 'dateTime', ue.userid, c.fullname FROM mdl_enrol AS e JOIN mdl_user_enrolments AS ue ON e.id = ue.enrolid JOIN mdl_course AS c ON e.courseid = c.id ORDER BY e.courseid ASC, ue.userid DESC;";
  }
}

function queryDB(query, callback){
  var data;
  connection.query(query, function(err, results, feilds){
      if(err) throw err;
      callback(null, results);
  }); 
}

function filterOneResult(fromDate, toDate, record){
  var begDate = new Date(fromDate);
  var endDate = new Date(toDate);
  var recordDate = new Date(record.dateTime);
  if (begDate > recordDate || recordDate > endDate) {
    return null;
  } else {
    return record;
  }
}

function parseInfoEHB(student, fieldid, data){
  // Predefined fieldids from moodle database make this annoying, but whatever
  if (fieldid == 1){ // State
    student.state = data;
  } else if (fieldid == 2){ // Organization Name
    student.orgName = data;
  } else if (fieldid == 3){ // Profession, primary area of work or study
    student.profession = data;
  } else if (fieldid == 4){ // Where do you practice?
    student.practice = data;
  } else if (fieldid == 5){ // Organization a primary care setting?
    student.primaryCare = data;
  } else if (fieldid == 6){ // Is it medically underserved?
    student.underServedCom = data;
  } else if (fieldid == 7){ // Is it in a rural area?
    student.ruralArea = data;
  } else if (fieldid == 8){ // Years in public health practice
    student.numYearsAtPractice = data;
  } else if (fieldid == 9){ // City
    student.city = data;
  } else if (fieldid == 10){ // Country
    student.country = data;
  } else if (fieldid == 11){ // If listed other as profession, what is your profession?
    student.otherProf = data;
  }
  
  return student;
}

function enrollmentProcessing(course, student){

  if((student) && (course.students.indexOf(student.id) < 0)){ // Ensure student exists and only has one enrollment per course 
    course.students.push(student.id);

    if (student.primaryCare == "yes" || student.primaryCare == true){
      course.numTrainedPrimaryCare += 1;
    }

    if (student.underServedCom == "yes" || student.underServedCom == true){
      course.numMedUnderServed += 1;
    }

    if (student.ruralArea == "yes" || student.ruralArea == true){
      course.numRuralArea += 1;
    }

    var sid = student.id;
    var profession = student.profession;
    var studentProfessionInfo = {id: sid, profession: profession};
    course.professions.push(studentProfessionInfo);
  
  }

  return course;
}

function listTopProfessions(course, professionsList){

  var topProfessions = {};

  for (var k = 0; k < professionsList.length; k++) {
   topProfessions[professionsList[k]] = (topProfessions[professionsList[k]] || 0) + 1;
  }

  for (var prof in topProfessions) {
    if (topProfessions.hasOwnProperty(prof)) {
      var curProf = topProfessions[prof];

    }
  }
  
  profSorted = Object.keys(topProfessions).sort(function(a,b){
    return topProfessions[a]-topProfessions[b];
  });

  profSorted = profSorted.reverse();

  for (var k = 0; k < 6; k++){
    if(profSorted[k]){
      course.sortedProfessions[k] = {profession: profSorted[k], count: topProfessions[profSorted[k]]};
    } else {
      course.sortedProfessions[k] = {profession: "None", count: "0"};
    }
  }

  if (profSorted.length > 7){
    var count = 0;
    for (var k = 7; k < profSorted.length; k++){
      count = count + topProfessions[profSorted[k]];
    }
    course.sortedProfessions[6] = {profession: "Remaining Professions", count: count};
  } else {
    course.sortedProfessions[6] = {profession: "Remaining Professions", count: 0};
  }

  return course;
}

function sumProfessions(courses){

  for (var i = 0; i < courses.length; i++){
    var course = courses[i];
    var professionsList = [];

    for (var j = 0; j < course.professions.length; j++){
      professionsList.push(course.professions[j].profession);   
    }

    course = listTopProfessions(course, professionsList);
  }

  return courses;
}

function indexStudents(data){
  var studentIds = [];
  var studentsList = [];

  function Student(id, firstname, lastname) {
    this.id = id;
    this.name  = firstname + " " + lastname;
    this.state = '';
    this.orgName = '';
    this.profession = '';
    this.practice = '';
    this.primaryCare = '';
    this.underServedCom = '';
    this.ruralArea = '';
    this.numYearsAtPractice = '';
    this.city = '';
    this.country = '';
    this.otherProf = '';
  }

  for (var i = 0; i < data.length; i++){
      var record = data[i];
      if (studentIds.indexOf(record.userid) < 0){
        student = new Student(record.userid, record.firstname, record.lastname);
        student = parseInfoEHB(student, record.fieldid, record.data);
        studentsList.push(student);
        studentIds.push(student.id);
      } else if (record.userid == student.id) {
        student = parseInfoEHB(student, record.fieldid, record.data);
      } else if ((studentIds.indexOf(record.userid) >= 0) && (record.userid != student.id)){
        var sid = record.userid;
        student = studentsList.find(s => s.id === sid);
        student = parseInfoEHB(student, record.fieldid, record.data);
      }
    }

  return studentsList;
}

function indexCoursesWithEnrolledStudents(data, studentsList, fromDate, toDate){
  var courseIds = [];
  var coursesList = [];

  function courseEnrollment(name, id){
    this.id = id;
    this.name = name;
    this.students = [];
    this.numTrainedPrimaryCare = 0;
    this.numMedUnderServed = 0;
    this.numRuralArea = 0;
    this.numTrainedByCourse = this.students.length;
    this.professions = [];
    this.sortedProfessions = [];
  }

  for(var i = 0; i < data.length; i++){
    var record = filterOneResult(fromDate, toDate, data[i]);
    if (record) {
      if (courseIds.indexOf(record.courseid) < 0){
        course = new courseEnrollment(record.fullname, record.courseid);
        var sid = record.userid;
        student = studentsList.find(u => u.id === sid);
        course = enrollmentProcessing(course, student);
        courseIds.push(course.id);
        coursesList.push(course);
      } else if ((courseIds.indexOf(record.courseid) >= 0) && (record.courseid != course.id)){
        var cid = record.courseId;
        course = coursesList.find(c => c.id === cid);
        var sid = record.userid;
        student = studentsList.find(u => u.id === sid);
        course = enrollmentProcessing(course, student);
      } else {
        var sid = record.userid;
        student = studentsList.find(u => u.id === sid);
        course = enrollmentProcessing(course, student);
      }
    }
  }
  return coursesList;
}

function saveCourse(cCourse, fromDate, toDate, callback){
  var course = new EhbCourse ({
    courseId: cCourse.id,
    courseName: cCourse.name,
    reportingPeriodFrom: fromDate,
    reportingPeriodTo: toDate,
    locationDataAvail: true,
    numTrainedPrimaryCare: cCourse.numTrainedPrimaryCare,
    numTrainedMedUnderServed: cCourse.numMedUnderServed,
    numTrainedRural: cCourse.numRuralArea,
    numTrained: cCourse.numTrainedByCourse,
    profession1: cCourse.sortedProfessions[0].profession,
    numProf1: cCourse.sortedProfessions[0].count,
    professsion2: cCourse.sortedProfessions[1].profession,
    numProf2: cCourse.sortedProfessions[1].count,
    profession3: cCourse.sortedProfessions[2].profession,
    numProf3: cCourse.sortedProfessions[2].count,
    profession4: cCourse.sortedProfessions[3].profession,
    numProf4: cCourse.sortedProfessions[3].count,
    profession5: cCourse.sortedProfessions[4].profession,
    numProf5: cCourse.sortedProfessions[4].count,
    profession6: cCourse.sortedProfessions[5].profession,
    numProf6: cCourse.sortedProfessions[5].count,
    numProfOther: cCourse.sortedProfessions[6].count
  });
  course.save(callback);
}

function clearOldCourses(callback){
  EhbCourse.remove({}, function(err, removed){
    callback(err, removed);
  });
}

function fillReport(fromDate, toDate, callback){
  var studentsList;
  var coursesList;

  var query = getQuery("ehbUsers");
  queryDB(query, function(err, data){
    if (err) throw err;
    studentsList = indexStudents(data);

    query = getQuery("ehbCourses");
    queryDB(query, function(err, data){
      if (err) throw err;
      coursesList = indexCoursesWithEnrolledStudents(data, studentsList, fromDate, toDate);
      coursesList = sumProfessions(coursesList);
      
      clearOldCourses(function(err, data){

        for (var i = 0; i < coursesList.length; i++){

          var cCourse = coursesList[i];

          if (i == (coursesList.length - 1)){ // trying to avoid callback hell
            saveCourse(cCourse, fromDate, toDate, function(err, data){
              if (err) throw err;
              callback(null, coursesList);
            });

          } else {
            var cCourse = coursesList[i];
            saveCourse(cCourse, fromDate, toDate, function(err, data){
              if (err) throw err;
            });
          }

        }

      });
    });
  });
}

module.exports.createCourses = function(fromDate, toDate, callback){
  fillReport(fromDate, toDate, function(err, results){
    if(err) throw err;
    callback(null, results);
  });
};

module.exports.getOneCourse = function(courseName, courseId, callback){
  EhbCourse.find({courseName: courseName, courseId: courseId}, function(err, course){
    if (err) throw err;
    callback(null, course);
  });
};

module.exports.updateCourse = function(course, formData, callback){

  var courseInfo = {
    lps: formData.ehblps,
    dateOfTraining: formData.ehbdateoftraining,
    contactName: formData.ehbcontactname,
    approvedContEd: formData.ehbappcontedu,
    durationHours: formData.ehbdurhours,
    numTimesOffered: formData.ehbnumtimesoffered,
    deliveryMode: formData.ehbdeliverymode,
    partnerShips1: formData.ehbpartnership1,
    partnerShips2: formData.ehbpartnership2,
    partnerShips3: formData.ehbpartnership3,
    partnerShips4: formData.ehbpartnership4,
    coursePrimaryTopicArea: formData.ehbprimarytopicarea,
    competencyTier: formData.ehbprimarycomp,
    courseDataCompleted: true
  };

  EhbCourse.update({courseName: course.courseName, courseId: course.courseId}, courseInfo, function(err, data){
    if (err) throw err;
    callback(null, data);
  });
};

module.exports.getCourses = function(callback){
  EhbCourse.find({}, function(err, courses){
    if (err) throw err;
    callback(null, courses);
  });
};

module.exports.listCourses = function(callback){
  EhbCourse.find({}, {courseName: 1, courseId: 1, courseDataCompleted: 1, reportingPeriodFrom: 1, reportingPeriodTo: 1,  _id: 1}, function(err, courses){
    if (err) throw err;
    callback(null, courses);
  });
};
