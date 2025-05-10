require('dotenv').config();
const express = require('express');
const router = express.Router();
const {
  fetchFlightsList,
  addAirlineInfoByCode,
} = require('../controllers/flights.controller');

router.post('/', fetchFlightsList);
router.post('/addAirlineInfo/:airlineCode', addAirlineInfoByCode);

module.exports = router;
