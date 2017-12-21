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

  partnerships1: {
    type: String,
    default: "None"
  },

  partnerships2: {
    type: String,
    default: "None"
  },

  partnerships3: {
    type: String,
    default: "None"
  },

  partnerships4: {
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
  },

  timeStamp: {
    type: Date
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
      var timeStampNow = new Date();
      var i = 0;
      async.eachSeries(coursesList, function(course, next) {
          var sortedProfs = course.sortedProfessions;
          course = new EhbCourse ({
            courseId: course.id,
            courseName: course.name,
            reportingPeriodFrom: fromDate,
            reportingPeriodTo: toDate,
            locationDataAvail: true,
            numTrainedPrimaryCare: course.numTrainedPrimaryCare,
            numTrainedMedUnderServed: course.numMedUnderServed,
            numTrainedRural: course.numRuralArea,
            profession1: sortedProfs[0].profession,
            numProf1: sortedProfs[0].count,
            profession2: sortedProfs[1].profession,
            numProf2: sortedProfs[1].count,
            profession3: sortedProfs[2].profession,
            numProf3: sortedProfs[2].count,
            profession4: sortedProfs[3].profession,
            numProf4: sortedProfs[3].count,
            profession5: sortedProfs[4].profession,
            numProf5: sortedProfs[4].count,
            profession6: sortedProfs[5].profession,
            numProf6: sortedProfs[5].count,
            numProfOther: sortedProfs[6].count,
            timeStamp: timeStampNow,
            numTrained: (sortedProfs[0].count + 
                 sortedProfs[1].count +
                 sortedProfs[2].count +
                 sortedProfs[3].count +
                 sortedProfs[4].count +
                 sortedProfs[5].count +
                 sortedProfs[6].count)
          });
          
          course.position = i;
          course.save(function(err, results){
            i++;
            next();
          });
        }, function(err) {
        if (err) throw err;
        EhbCourse.remove({timeStamp: {$ne: timeStampNow}}, function(err, results){
          if (err) throw err;
          callback(null, results);
        });
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
    partnerships1: formData.ehbpartnership1,
    partnerships2: formData.ehbpartnership2,
    partnerships3: formData.ehbpartnership3,
    partnerships4: formData.ehbpartnership4,
    coursePrimaryTopicArea: formData.ehbprimarytopicarea,
    primaryCompetency: formData.ehbprimarycomp,
    competencyTier: formData.ehbcompetencytier,
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

module.exports.generateExcelFile = function(callback){
  EhbCourse.find({}, function(err, courses){
    var wb = new xl.Workbook();
    var ws = wb.addWorksheet('EHB Report');

    var styleBlue = {
          alignment: {wrapText: true}, 
          fill: {type: 'pattern', patternType: 'solid', fgColor: 'A5C3F2'},
          border: {left: {style: 'thin', color: '000000'}, right: {style: 'thin', color: '000000'}, top: {style: 'thin', color: '000000'}, bottom: {style: 'thin', color: '000000'}}
        };

    var styleRed = {
          alignment: {wrapText: true}, 
          fill: {type: 'pattern', patternType: 'solid', fgColor: 'E8999A'},
          border: {left: {style: 'thin', color: '000000'}, right: {style: 'thin', color: '000000'}, top: {style: 'thin', color: '000000'}, bottom: {style: 'thin', color: '000000'}}
        };

    var styleYellow = {
          alignment: {wrapText: true}, 
          fill: {type: 'pattern', patternType: 'solid', fgColor: 'FEE49D'},
          border: {left: {style: 'thin', color: '000000'}, right: {style: 'thin', color: '000000'}, top: {style: 'thin', color: '000000'}, bottom: {style: 'thin', color: '000000'}}
        };

    ws.cell(1, 1, 1, 4, true).string('Reporting Information').style(styleBlue);
    // ...
      ws.cell(1, 5, 1, 20, true).string('CE1').style(styleRed);
      ws.cell(1, 21, 1, 34, true).string('CE2').style(styleYellow);
      ws.cell(2, 1).string('LPS').style(styleBlue);
      ws.cell(2, 2).string('Reporting Period').style(styleBlue);
      ws.cell(2, 3).string('Date of Training (if live training session)').style(styleBlue);
      ws.cell(2, 4).string('Contact Name').style(styleBlue);
      ws.cell(2, 5).string('Course Title').style(styleRed);
      ws.cell(2, 6).string('Select Whether Course is Approved for Continuing Education Credit').style(styleRed);
      ws.cell(2, 7).string('Enter the Duration of the Course in Clock Hours').style(styleRed);
      ws.cell(2, 8).string('Enter # of Times Course was Offered').style(styleRed);
      ws.cell(2, 9).string('Select Delivery Mode Used to Offer Course').style(styleRed);
      ws.cell(2, 10).string('Select Type(s) of Partnership(s) Established for the Purposes of Delivering this Course (1)').style(styleRed);
      ws.cell(2, 11).string('Select Type(s) of Partnership(s) Established for the Purposes of Delivering this Course (2)').style(styleRed);
      ws.cell(2, 12).string('Select Type(s) of Partnership(s) Established for the Purposes of Delivering this Course (3)').style(styleRed);
      ws.cell(2, 13).string('Select Type(s) of Partnership(s) Established for the Purposes of Delivering this Course (4)').style(styleRed);
      ws.cell(2, 14).string('Select Whether Employment Location Data are Available for Individuals Trained').style(styleRed);
      ws.cell(2, 15).string('Enter # of Individuals Trained in a Primary Care Setting').style(styleRed);
      ws.cell(2, 16).string('Enter # of Individuals Trained in a Medically Underserved Community').style(styleRed);
      ws.cell(2, 17).string('Enter # of Individuals Trained in a Rural Area').style(styleRed);
      ws.cell(2, 18).string('Select the Courses Primary Topic Area').style(styleRed);
      ws.cell(2, 19).string('Select the Primary Competency Addressed by the Course').style(styleRed);
      ws.cell(2, 20).string('Select the Competency Tier for this Course').style(styleRed);
      ws.cell(2, 21).string('Enter Total # of Individuals Trained').style(styleYellow);
      ws.cell(2, 22).string('Select Profession and Discipline of Individuals Trained (1)').style(styleYellow);
      ws.cell(2, 23).string('Enter # Trained in this Profession and Discipline').style(styleYellow);
      ws.cell(2, 24).string('Select Profession and Discipline of Individuals Trained (2)').style(styleYellow);
      ws.cell(2, 25).string('Enter # Trained in this Profession and Discipline').style(styleYellow);
      ws.cell(2, 26).string('Select Profession and Discipline of Individuals Trained (3)').style(styleYellow);
      ws.cell(2, 27).string('Enter # Trained in this Profession and Discipline').style(styleYellow);
      ws.cell(2, 28).string('Select Profession and Discipline of Individuals Trained (4)').style(styleYellow);
      ws.cell(2, 29).string('Enter # Trained in this Profession and Discipline').style(styleYellow);
      ws.cell(2, 30).string('Select Profession and Discipline of Individuals Trained (5)').style(styleYellow);
      ws.cell(2, 31).string('Enter # Trained in this Profession and Discipline').style(styleYellow);
      ws.cell(2, 32).string('Select Profession and Discipline of Individuals Trained (6)').style(styleYellow);
      ws.cell(2, 33).string('Enter # Trained in this Profession and Discipline').style(styleYellow);
    ws.cell(2, 34).string('Enter Remaining # of Trainees for this Course').style(styleYellow);
    
    var row = 3;
    for (var i = 0; i < courses.length; i++){
      var c = courses[i];
      ws.cell(row, 1).string(c.lps).style({ alignment: {wrapText: true} });
      ws.cell(row, 2).date(new Date(c.reportingPeriodFrom));
      ws.cell(row, 3).date(new Date(c.dateOfTraining));
      ws.cell(row, 4).string(c.contactName).style({ alignment: {wrapText: true} });
      ws.cell(row, 5).string(c.courseName).style({ alignment: {wrapText: true} });
      ws.cell(row, 6).bool(c.approvedContEd);
      ws.cell(row, 7).number(c.durationHours);
      ws.cell(row, 8).number(c.numTimesOffered);
      ws.cell(row, 9).string(c.deliveryMode).style({ alignment: {wrapText: true} });
      ws.cell(row, 10).string(c.partnerships1).style({ alignment: {wrapText: true} });
      ws.cell(row, 11).string(c.partnerships2).style({ alignment: {wrapText: true} });
      ws.cell(row, 12).string(c.partnerships3).style({ alignment: {wrapText: true} });
      ws.cell(row, 13).string(c.partnerships4).style({ alignment: {wrapText: true} });
      ws.cell(row, 14).bool(c.locationDataAvail);
      ws.cell(row, 15).number(c.numTrainedPrimaryCare);
      ws.cell(row, 16).number(c.numTrainedMedUnderServed);
      ws.cell(row, 17).number(c.numTrainedRural);
      ws.cell(row, 18).string(c.coursePrimaryTopicArea).style({ alignment: {wrapText: true} });
      ws.cell(row, 19).string(c.primaryCompetency).style({ alignment: {wrapText: true} });
      ws.cell(row, 20).string(c.competencyTier).style({ alignment: {wrapText: true} });
      ws.cell(row, 21).number(c.numTrained);
      ws.cell(row, 22).string(c.profession1).style({ alignment: {wrapText: true} });
      ws.cell(row, 23).number(c.numProf1);
      ws.cell(row, 24).string(c.profession2).style({ alignment: {wrapText: true} });
      ws.cell(row, 25).number(c.numProf2);
      ws.cell(row, 26).string(c.profession3).style({ alignment: {wrapText: true} });
      ws.cell(row, 27).number(c.numProf3);
      ws.cell(row, 28).string(c.profession4).style({ alignment: {wrapText: true} });
      ws.cell(row, 29).number(c.numProf4);
      ws.cell(row, 30).string(c.profession5).style({ alignment: {wrapText: true} });
      ws.cell(row, 31).number(c.numProf5);
      ws.cell(row, 32).string(c.profession6).style({ alignment: {wrapText: true} });
      ws.cell(row, 33).number(c.numProf6);
      ws.cell(row, 34).number(c.numProfOther);

      row += 1;
    }

    var fileName = "shareableEhbReport.xlsx";
    wb.write(fileName);
    callback(null, fileName);
  });
};
