const DummyTicket = require('../models/DummyTicket');

exports.getAllTickets = async (req, res) => {
  try {
    const searchQuery = req.query.name;
    const filter = searchQuery
      ? {
          passengers: {
            $elemMatch: {
              $or: [
                { firstName: { $regex: searchQuery, $options: 'i' } }, // Case-insensitive search
                { lastName: { $regex: searchQuery, $options: 'i' } },
                { email: { $regex: searchQuery, $options: 'i' } },
              ],
            },
          },
        }
      : {};

    const data = await DummyTicket.find(filter).sort({ createdAt: -1 }).limit(100);
    res.status(200).json({
      status: 'success',
      message: 'Tickets fetched',
      data,
    });
  } catch (error) {
    console.error('Error in getAllTickets:', error); // Debugging log
    res.status(500).json({
      status: 'fail',
      message: 'An error occurred',
    });
  }
};

exports.deleteTicket = async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log(sessionId);
    const data = await DummyTicket.findOneAndDelete({ sessionId: sessionId });
    if (!data) {
      return res.status(404).json({ status: 'fail', message: 'Could not delete data' });
    }
    res.status(200).json({ status: 'success', message: 'Data deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: 'Server error. Could not delete.' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { user, orderStatus } = req.body;
    console.log(user, orderStatus);
    const data = await DummyTicket.findOneAndUpdate(
      { sessionId: sessionId },
      {
        $set: {
          orderStatus: orderStatus,
          handledBy: user,
        },
      }
    );
    if (!data) {
      return res.status(404).json({ status: 'fail', message: 'Could not find data' });
    }
    res.status(200).json({
      status: 'success',
      message: `Order status set to ${orderStatus}`,
    });
  } catch (error) {
    res.status(500).json({ status: 'fail', message: 'Server error. Could not delete.' });
  }
};

// exports.updateUser = async (req, res) => {
//   try {
//     const { username } = req.params;
//     const userData = req.body;
//     const newPassword = req.body.newPassword;
//     if (newPassword) {
//       const salt = await bcrypt.genSalt(saltRounds);
//       const hashedNewPassword = await bcrypt.hash(newPassword, salt);
//       userData.password = hashedNewPassword;
//     }
//   } catch (error) {
//     res.status(500).json({ status: 'fail', message: 'Server error. Could not delete user.' });
//   }
// };
