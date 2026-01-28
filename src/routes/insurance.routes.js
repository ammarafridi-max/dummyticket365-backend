const router = require('express').Router();
const {
  getInsuranceQuotes,
  finalizeInsurance,
  createNationalities,
  getNationalities,
  getInsuranceApplication,
  downloadInsurancePolicy,
} = require('../controllers/insurance.controller');

router.route('/quote').post(getInsuranceQuotes);
router.route('/finalize').post(finalizeInsurance);
router.route('/nationalities').post(createNationalities);
router.route('/nationalities').get(getNationalities);
router.route('/download/:policyId').get(downloadInsurancePolicy);
router.route('/:sessionId').get(getInsuranceApplication);

module.exports = router;
