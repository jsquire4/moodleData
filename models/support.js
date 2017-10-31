var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var supportTicketSchema = new Schema({
  userid: {
    type: String
  },

  username: {
    type: String
  },

  fullname: {
    type: String
  },

  email: {
    type: String,
  },

  subject: {
    type: String
  },

  body: {
    type: String
  },

  submitted: {
    type: Date
  },

  filled: {
    type: Date,
    default: null
  },

  resolved: {
    type: Boolean,
  },

  message: {
    type: String
  }

});

var Ticket = module.exports =  mongoose.model('Ticket', supportTicketSchema);

module.exports.updateTicket = function(ticketId, updatedTicket, callback) {
  // TO DO: Create mailing function taht notifies the user and rest of admin when a ticket is resolved
  var query = {_id: ticketId};
  Ticket.update(query, updatedTicket, callback);
}

module.exports.createTicket = function(ticket, callback) {
  // TO DO: Create mailing function that notifies the support personnel when a new ticket is created
  ticket.save(callback);
}

module.exports.getTicketById = function(ticketId, callback){
  Ticket.findbyId(ticketId, callback);
}

module.exports.getTickets = function(user, callback){
 var pending;
 var completed;

  if (user.admin) {
    

    pending = Ticket.find({resolved: false}, 'subject body', function(err, data){
      if (err) throw err;
      return data;
    });

    completed = Ticket.find({resolved: true}, 'subject body', function(err, data){
      if (err) throw err;
      return data;
    });




  } else {
    pending = Ticket.find({resolved: false, userid: user.id}, 'subject body', function(err, data){
      if (err) throw err;
      return data;
    });

    completed = Ticket.find({resolved: true, userid: user.id}, 'subject body', function(err, data){
      if (err) throw err;
      return data;
    });
  }

  var data = {pending: pending, completed: completed, user: user};
  callback(null, data);
}









