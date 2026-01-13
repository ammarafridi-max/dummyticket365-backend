const router = require('express').Router();
const airportController = require('../controllers/airport.controller');

router.get('/', airportController.fetchAirports);

module.exports = router;
