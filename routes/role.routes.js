require('dotenv').config();
const express = require('express');
const { getRoles, getRole, createRole, updateRole } = require('../controllers/role.controller');
const router = express.Router();

router.route('/').get(getRoles).post(createRole);
router.route('/:slug').get(getRole).put(updateRole).delete();

module.exports = router;
