require('dotenv').config();
const Amadeus = require('amadeus');

const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_API_KEY,
  clientSecret: process.env.AMADEUS_SECRET_KEY,
  hostname: 'production',
});

module.exports = amadeus;
