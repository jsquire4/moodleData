var mysql = require('mysql');
require('dotenv').config();

var connection = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASS,
  database: 'moodle'
});

var Reporter = module.exports;

module.exports.testConnection = function(){
  connection.connect(function(err) {
    if (err) {
      console.log(err);
    } else {
      console.log("Success!");
    }
  });
  connection.end();
}
