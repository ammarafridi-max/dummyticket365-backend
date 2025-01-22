require('dotenv').config();
const express = require('express');
const router = express.Router();
const amadeus = require('../utils/amadeus');

const fetchAirports = async (req, res) => {
  const keyword = req.query.keyword;

  if (!keyword) {
    return res.status(400).json({ message: 'Keyword is required' });
  }

  try {
    const airports = await amadeus.referenceData.locations.get({
      subType: 'AIRPORT',
      keyword: keyword,
    });
    return res.status(200).json({
      status: 'success',
      message: 'Airports list fetched successfully',
      data: airports.data,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'An unexpected error occurred' });
  }
};

router.get('/', fetchAirports);

module.exports = router;
