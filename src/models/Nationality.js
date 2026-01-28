const mongoose = require('mongoose');

const nationalitySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  nationality: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model('Nationality', nationalitySchema);
