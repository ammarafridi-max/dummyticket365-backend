const mongoose = require('mongoose');

const AirlineSchema = mongoose.Schema({
  iataCode: { type: String },
  icaoCode: { type: String },
  businessName: { type: String },
  commonName: { type: String },
  logo: { type: String },
});

const Airline = mongoose.model('airline', AirlineSchema);

module.exports = Airline;
