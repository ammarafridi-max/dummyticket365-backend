const { v4: isUuid } = require('uuid');
const DummyTicket = require('../models/DummyTicket');

const validateSessionId = async (req, res, next) => {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId || !isUuid(sessionId)) {
    return res.status(400).json({ message: 'Invalid or missing session ID' });
  }
  const sessionInfo = await DummyTicket.findOne({ sessionId: sessionId });
  if (!sessionInfo) {
    return res.status(401).json({
      error: true,
      message: 'Unauthorized!',
    });
  }
  req.sessionId = sessionId;
  req.sessionInfo = sessionInfo;

  next();
};

module.exports = validateSessionId;
