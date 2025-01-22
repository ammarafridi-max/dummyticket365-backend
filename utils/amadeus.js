require('dotenv').config();
const Amadeus = require('amadeus');

const API_KEY = process.env.AMADEUS_KEY;
const SECRET_KEY = process.env.AMADEUS_SECRET;

const amadeus = new Amadeus({
  clientId: API_KEY,
  clientSecret: SECRET_KEY,
  hostname: 'production',
});

module.exports = amadeus;
