var express = require('express');
var router = express.Router();

var Reporter = require("../models/reports")

router.get('/index', function(req, res){
  Reporter.testConnection();
  res.render('reportindex');
});

module.exports = router;