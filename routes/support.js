var express = require('express');
var router = express.Router();

var Ticket = require("../models/support");
var User = require('../models/user');

router.get('/', isLoggedIn, function(req, res){
  res.render('support');
});

router.get('/submitted', function(req, res){
  res.render('submitted');
});

router.get('/tickets', isLoggedIn, function(req, res){

  // Just allow users to pass through to the support area for now
  var user = req.user;

  Ticket.getTickets(user, function(err, data){
    if (err) throw err;
    res.render('tickets', {data: data});
  });
});

router.get('/view/:id', isLoggedIn, function(req, res){
  var ticket = Ticket.getTicketById(ticketId, function(err, ticket){
    return ticket;
  });
  render('ticketview', {ticket: ticket});
});

router.get('/update/:id', ensureAdmin, function(req, res){

  var ticket = Ticket.getTicketById(ticketId, function(err, ticket){
    return ticket;
  });

  render('ticketupdate', {ticket: ticket});
});

router.put('/update/:id', ensureAdmin, function(req, res){
  // TO DO: Allow method of updating support ticket
  render('ticketupdate', {ticket: ticket});
});

router.post('/', isLoggedIn, function(req, res){
  var user = req.user;
  var userid = req.user.id;
  var username = user.username;
  var fullname = user.firstname + " " + user.lastname;
  var email = user.email;
  var subject = req.body.subject;
  var body = req.body.body;
  var submitted = Date.now();

  // VALIDATION
  req.checkBody('subject', 'You must include a subject line').notEmpty();
  req.checkBody('body', 'Please describe the issue in the box').notEmpty();

  var errors = req.validationErrors();

  if (errors) {
    res.render ('support', {
      errors: errors
    });

  } else {
    
    var newTicket = new Ticket ({
      userid: userid,
      username: username,
      fullname: fullname,
      email: email,
      subject: subject,
      body: body,
      submitted: submitted,
      resolved: false,
      message: "The admin has been notified and will be addressing this shortly"
    });

    Ticket.createTicket(newTicket, function(err, data){
      if(err) throw err;
    });

    req.flash('success_msg', 'Support Ticket Submitted');
    res.redirect('/support/submitted');
  }
});

i

function ensureAdmin(req, res, next){
  if(req.isAuthenticated()){
    if (req.user.admin){
      next();
    } else {
      req.flash('error_msg', "You are not permitted to see that page, talk to an administrator for access");
      res.redirect('/');
    }
  } else {
    req.flash('error_msg', 'You are not logged in.  Log in or register to continue.');
    res.redirect('/users/login');
  }
}

module.exports = router; 