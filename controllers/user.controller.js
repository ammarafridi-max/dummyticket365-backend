const User = require('../models/User');
const bcrypt = require('bcrypt');
const saltRounds = 10;

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({});
    if (!users) return res.status(404).json({ status: 'fail', message: 'Could not find users' });
    res.status(200).json({ status: 'success', message: 'Users fetched successfully', data: users });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: 'Server error. Could not fetch.' });
  }
};

exports.getUser = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username: username });
    if (!user)
      return res
        .status(404)
        .json({ status: 'fail', message: `Could not find username ${username}` });
    return res
      .status(200)
      .json({ status: 'success', message: 'User found successfully', data: user });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: 'Server error. Could not fetch.' });
  }
};

exports.createUser = async (req, res) => {
  try {
    const userData = req.body;
    const password = req.body.password;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(password, salt);
    userData.password = hashedPassword;
    const newUser = await User.create(userData);
    return res
      .status(200)
      .json({ status: 'success', message: 'User created successfully', data: newUser });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: 'Server error. Could not create user.' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { username } = req.params;
    if (!username) return res.json({ status: 'fail', message: 'Username is missing' });
    const user = await User.findOneAndDelete({ username: username });
    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'Could not delete user' });
    }
    return res
      .status(200)
      .json({ status: 'success', message: `User ${username} deleted successfully` });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: 'Server error. Could not delete user.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username: username });
    if (!user) {
      return res.status(404).json({ status: 'failed', message: 'User not found' });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ status: 'failed', message: 'Wrong password' });
    res.status(200).json({
      status: 'success',
      message: 'Authentication successful',
      data: user,
    });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: 'Server error. Could not login.' });
  }
};
