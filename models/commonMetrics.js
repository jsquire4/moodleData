var mysql = require('mysql');
var async = require('async');
require('datejs');
require('dotenv').config();
var xl = require('excel4node')
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

  courseDataCompleted: {
    type: Boolean,
    default: false
  },

  timeStamp: {
    type: Date
  }
});


var CmCourse = module.exports =  mongoose.model('CmCourse', cmCourseSchema);