require('dotenv').config();
const express = require('express');
const router = express.Router();
const airportController = require('../controllers/airport.controller');

router.get('/', airportController.fetchAirports);

module.exports = router;
