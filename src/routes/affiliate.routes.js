const router = require('express').Router();
const affiliateController = require('../controllers/affiliate.controller');
const validate = require('../middleware/validate');
const { createAffiliateSchema, updateAffiliateSchema } = require('../validators/affiliate.validator');
const { protect, restrictTo } = require('../middleware/auth.middleware');

router.use(protect, restrictTo('admin', 'agent'));

router.post('/seed', affiliateController.seedAffiliates);
router.get('/:id/stats', affiliateController.getAffiliateStatsById);
router.get('/:id/tickets', affiliateController.getAffiliateTicketsById);

router.route('/').get(affiliateController.getAffiliates).post(validate(createAffiliateSchema), affiliateController.createAffiliate);

router
  .route('/:id')
  .get(affiliateController.getAffiliateById)
  .patch(validate(updateAffiliateSchema), affiliateController.updateAffiliateById)
  .delete(affiliateController.deleteAffiliateById);

module.exports = router;
