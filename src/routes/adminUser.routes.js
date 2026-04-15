const router = require('express').Router();
const adminUserController = require('../controllers/adminUser.controller');
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const { updateCurrentAdminSchema, updatePasswordSchema } = require('../validators/auth.validator');
const { createAdminUserSchema, updateAdminUserSchema } = require('../validators/adminUser.validator');
const { protect, restrictTo } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/me', authController.currentUserInfo);
router.patch('/me', validate(updateCurrentAdminSchema), authController.updateCurrentUser);
router.patch('/me/password', validate(updatePasswordSchema), authController.updatePassword);

router.use(restrictTo('admin'));

router.route('/').get(adminUserController.getAdminUsers).post(validate(createAdminUserSchema), adminUserController.createAdminUser);

router
  .route('/:username')
  .get(adminUserController.getAdminUser)
  .patch(validate(updateAdminUserSchema), adminUserController.updateAdminUser)
  .delete(adminUserController.deleteAdminUser);

module.exports = router;
