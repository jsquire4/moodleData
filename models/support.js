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

module.exports.getAllPending = function(userType, callback){
  // TO DO: Create query that finds all pending support tickets based on the user's admin/not admin status
  // and returns the proper tickets
}

module.exports.getAllCompleted = function(userType, callback){
  // TO DO: Create query that finds all completed support tickets based on the user's admin/not admin status
  // and returns the proper tickets
}












