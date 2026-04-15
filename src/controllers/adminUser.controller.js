const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const adminUserService = require('../services/adminUser.service');

exports.getAdminUsers = catchAsync(async (req, res) => {
  const adminUsers = await adminUserService.getAdminUsers(req.query || {});

  res.status(200).json({
    status: 'success',
    message: 'Admin users fetched successfully',
    data: adminUsers,
  });
});

exports.getAdminUser = catchAsync(async (req, res, next) => {
  const adminUser = await adminUserService.getAdminUserByUsername(req.params.username);

  res.status(200).json({
    status: 'success',
    message: 'Admin user found successfully',
    data: adminUser,
  });
});

exports.createAdminUser = catchAsync(async (req, res, next) => {
  const adminUser = await adminUserService.createAdminUser(req.body);

  res.status(201).json({
    status: 'success',
    data: adminUser,
  });
});

exports.updateAdminUser = catchAsync(async (req, res, next) => {
  const adminUser = await adminUserService.updateAdminUserByUsername(req.params.username, req.body, req.user);

  res.status(200).json({
    status: 'success',
    message: 'Admin user updated successfully',
    data: adminUser,
  });
});

exports.deleteAdminUser = catchAsync(async (req, res) => {
  const adminUser = await adminUserService.deleteAdminUserByUsername(req.params.username, req.user);

  res.status(200).json({
    status: 'success',
    message: `Admin user ${adminUser.username} deleted successfully`,
  });
});
