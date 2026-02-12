const router = require('express').Router();
const {
  getAllApplications,
  getInsuranceQuotes,
  finalizeInsurance,
  createNationalities,
  getNationalities,
  getInsuranceApplication,
  downloadInsurancePolicy,
  getInsuranceDocuments,
} = require('../controllers/insurance.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

router.route('/').get(protect, restrictTo('admin', 'agent'), getAllApplications);
router.route('/quote').post(getInsuranceQuotes);
router.route('/finalize').post(finalizeInsurance);
// router.route('/nationalities').post(protect, restrictTo('admin'), createNationalities);
router.route('/nationalities').post(createNationalities);
router.route('/nationalities').get(getNationalities);
router.route('/download/:policyId/:index').get(downloadInsurancePolicy);
router.route('/documents/:policyId').get(getInsuranceDocuments);
router.route('/:sessionId').get(getInsuranceApplication);

module.exports = router;
