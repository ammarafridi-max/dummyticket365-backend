const router = require('express').Router();
const {
  getAllApplications,
  createInsuranceApplication,
  updateInsuranceApplication,
  deleteInsuranceApplication,
  getInsuranceQuotes,
  finalizeInsurance,
  createNationalities,
  getNationalities,
  getInsuranceApplication,
  downloadInsurancePolicy,
  getInsuranceDocuments,
  confirmInsurancePayment,
  getApplicationsSummary,
} = require('../controllers/insurance.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

router.route('/').get(protect, restrictTo('admin', 'agent'), getAllApplications);
router.route('/summary').get(protect, restrictTo('admin', 'agent'), getApplicationsSummary);
router.route('/create').post(createInsuranceApplication);
router.route('/quote').post(getInsuranceQuotes);
router.route('/finalize').post(finalizeInsurance);
router.route('/nationalities').post(protect, restrictTo('admin'), createNationalities);
router.route('/nationalities').get(getNationalities);
router.route('/download/:policyId/:index').get(downloadInsurancePolicy);
router.route('/documents/:policyId').get(getInsuranceDocuments);
router.route('/confirm-payment/:sessionId').post(confirmInsurancePayment);
router
  .route('/:sessionId')
  .get(protect, restrictTo('admin', 'agent'), getInsuranceApplication)
  .patch(protect, restrictTo('admin', 'agent'), updateInsuranceApplication)
  .delete(protect, restrictTo('admin'), deleteInsuranceApplication);

module.exports = router;
