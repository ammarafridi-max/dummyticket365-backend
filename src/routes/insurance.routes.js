const router = require('express').Router();
const { getInsuranceQuotes } = require('../controllers/insurance.controller');

router.route('/quote').post(getInsuranceQuotes);

module.exports = router;
