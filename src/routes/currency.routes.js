const express = require('express');
const router = express.Router();
const currencyController = require('../controllers/currency.controller');
const validate = require('../middleware/validate');
const { createCurrencySchema, updateCurrencySchema } = require('../validators/currency.validator');
const { protect, restrictTo } = require('../middleware/auth.middleware');

router
  .route('/')
  .get(currencyController.getCurrencies)
  .post(protect, restrictTo('admin', 'agent'), validate(createCurrencySchema), currencyController.createCurrency);

router
  .route('/:code')
  .get(currencyController.getCurrencyByCode)
  .put(protect, restrictTo('admin', 'agent'), validate(updateCurrencySchema), currencyController.updateCurrency)
  .delete(protect, restrictTo('admin', 'agent'), currencyController.deleteCurrency);

module.exports = router;
