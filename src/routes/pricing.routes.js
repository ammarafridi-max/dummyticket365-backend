const router = require('express').Router();
const pricingController = require('../controllers/dummyTicketPricing.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

router.get('/dummy-ticket', pricingController.getDummyTicketPricing);

router.use(protect, restrictTo('admin'));

router.get('/dummy-ticket/admin', pricingController.getDummyTicketPricingAdmin);
router.patch('/dummy-ticket/admin', pricingController.updateDummyTicketPricing);

module.exports = router;
