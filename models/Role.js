const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: [true, 'Slug must be unique'] },
  permissions: {
    dummyTickets: {
      read: { type: Boolean },
      update: { type: Boolean },
      delete: { type: Boolean },
    },
    users: {
      create: { type: Boolean },
      read: { type: Boolean },
      update: { type: Boolean },
      delete: { type: Boolean },
    },
    roles: {
      create: { type: Boolean },
      read: { type: Boolean },
      update: { type: Boolean },
      delete: { type: Boolean },
    },
    others: {
      readAmount: { type: Boolean },
    },
  },
});

const Role = mongoose.model('role', RoleSchema);

module.exports = Role;
