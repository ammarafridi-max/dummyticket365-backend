const amadeus = require('../utils/amadeus');

exports.fetchAirports = async (req, res) => {
  const keyword = req.query.keyword;

  if (!keyword) {
    return res.status(400).json({
      status: 'error',
      message:
        'Airport code is required and must be at least 3 characters long.',
    });
  }

  const response = await amadeus.referenceData.locations.get({
    subType: 'AIRPORT',
    keyword: keyword,
  });

  const data = response.data;

  return res.status(200).json({
    message: 'airports list fetched successfully',
    result: data,
  });
};
