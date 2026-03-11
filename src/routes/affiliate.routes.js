const router = require('express').Router();
const affiliateController = require('../controllers/affiliate.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

router.use(protect, restrictTo('admin'));

router.post('/seed', affiliateController.seedAffiliates);
router.get('/:id/stats', affiliateController.getAffiliateStatsById);
router.get('/:id/tickets', affiliateController.getAffiliateTicketsById);

router.route('/').get(affiliateController.getAffiliates).post(affiliateController.createAffiliate);

router
  .route('/:id')
  .get(affiliateController.getAffiliateById)
  .patch(affiliateController.updateAffiliateById)
  .delete(affiliateController.deleteAffiliateById);

module.exports = router;
