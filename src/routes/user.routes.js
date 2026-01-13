const router = require('express').Router();
const userController = require('../controllers/user.controller');
const authController = require('../controllers/auth.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/me', authController.currentUserInfo);
router.patch('/me', authController.updateCurrentUser);
router.patch('/me/password', authController.updatePassword);

router.use(restrictTo('admin'));

router.route('/').get(userController.getUsers).post(userController.createUser);

router
  .route('/:username')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
