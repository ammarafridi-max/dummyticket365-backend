const router = require('express').Router();
const { fetchFlightsList, addAirlineInfoByCode } = require('../controllers/flight.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

router.route('/').post(fetchFlightsList);

router.post('/airlines/:airlineCode', protect, restrictTo('admin'), addAirlineInfoByCode);

module.exports = router;
