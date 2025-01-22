const express = require('express');
const {
  getUsers,
  getUser,
  createUser,
  deleteUser,
  login,
} = require('../controllers/user.controller');
const router = express.Router();

router.route('/').get(getUsers).post(createUser);
router.route('/login').post(login);
router.route('/:username').get(getUser).put().delete(deleteUser);

module.exports = router;
