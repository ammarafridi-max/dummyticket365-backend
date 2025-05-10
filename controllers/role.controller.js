const express = require('express');
const Role = require('../models/Role');

exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.find({});
    if (!roles) return res.status(404).json({ status: 'fail', message: 'Roles not found' });
    res.status(200).json({ status: 'success', message: 'Roles found successfully', data: roles });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: 'Server error occurred' });
  }
};

exports.getRole = async (req, res) => {
  try {
    const { slug } = req.params;
    const role = await Role.findOne({ slug: slug });
    if (!role) return res.status(404).json({ status: 'fail', message: 'Could not find role' });
    return res
      .status(200)
      .json({ status: 'success', message: 'Role found successfully', data: role });
  } catch (error) {
    console.log(error);
    res.status(500).json({ status: 'fail', message: 'Server error occurred' });
  }
};

exports.createRole = async (req, res) => {
  try {
    const { name, slug, permissions } = req.body;
    console.log(name, slug, permissions);
    if (!name || !slug || !permissions) {
      return res
        .status(400)
        .json({ status: 'fail', message: 'Name, slug, and permissions are required' });
    }
    const role = { name, slug, permissions };
    const data = await Role.create(role);
    res.status(200).json({ status: 'success', message: 'Roles create successfully', data });
  } catch (error) {
    console.error('Error creating role:', error.message);
    res.status(500).json({
      status: 'fail',
      message: 'Server error occurred',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const { slug } = req.params;
    const data = req.body;
    const role = await Role.findOneAndUpdate({ slug: slug }, data, { new: true });
    if (!role) return res.status(404).json({ status: 'fail', message: 'Role not found' });
    res.status(200).json({ status: 'success', message: 'Role updated successfully', data: role });
  } catch (error) {
    res.status(500).json({
      status: 'fail',
      message: 'Server error occurred',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
