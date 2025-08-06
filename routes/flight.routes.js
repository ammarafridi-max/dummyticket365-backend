require('dotenv').config();
const express = require('express');
const router = express.Router();
const {
  fetchFlightsList,
  addAirlineInfoByCode,
} = require('../controllers/flight.controller');

router.route('/').post(fetchFlightsList);
router.route('/add').post(addAirlineInfoByCode);

module.exports = router;
