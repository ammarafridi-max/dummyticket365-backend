const Airline = require('../models/Airline');
require('dotenv').config();
const amadeus = require('../utils/amadeus');
const extractIataCode = require('../utils/extractIataCode');
const formatAmadeusDate = require('../utils/formatAmadeusDate');

exports.addAirlineInfoByCode = async (req, res) => {
  try {
    const airlineCode = req.params.airlineCode;

    const exists = await Airline.findOne({ iataCode: airlineCode });

    if (exists)
      return res
        .status(402)
        .json({ message: 'This airline data already exists' });

    const response = await amadeus.referenceData.airlines.get({
      airlineCodes: airlineCode,
    });

    const [data] = response.data;
    if (!data) {
      return res.status(404).json({
        message: 'No airline found',
      });
    }
    if (data.icaoCode === undefined || data.businessName === 'UNDEFINED') {
      return res.status(404).json({
        message: 'Data not found',
      });
    }

    const airlineDetails = {
      iataCode: data.iataCode,
      icaoCode: data.icaoCode,
      businessName: data.businessName,
      commonName: data.commonName,
    };

    const airlineInfo = await Airline.create(airlineDetails);

    return res.status(200).json({
      message: 'Airline Info saved successfully',
      result: airlineInfo,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.fetchFlightsList = async (req, res) => {
  try {
    const { type, from, to, departureDate, returnDate } = req.body;

    if (!from || !to || !departureDate) {
      return res.status(404).json({
        status: 'fail',
        message:
          'Please provide the departure destination, arrival destination, and the departure date',
      });
    }

    const quantity = { adults: 1, children: 0, infants: 0 };

    const flightSearchParams = {
      originLocationCode: extractIataCode(from),
      destinationLocationCode: extractIataCode(to),
      departureDate,
      adults: quantity.adults,
      children: quantity.children,
      infants: quantity.infants,
      ...(type === 'Return' && returnDate ? { returnDate } : {}),
    };

    const response =
      await amadeus.shopping.flightOffersSearch.get(flightSearchParams);
    if (!response?.data) {
      return res.status(404).json({ message: 'No flights available' });
    }

    let flights = response.data;

    flights = flights.filter(
      (flight) => flight.itineraries[0].segments.length <= 2
    );

    const airlineCodes = [
      ...new Set(flights.flatMap((flight) => flight.validatingAirlineCodes)),
    ];

    const airlinesInDb = await Airline.find({
      iataCode: { $in: airlineCodes },
    });

    const airlinesInDbMap = new Map(
      airlinesInDb.map((airline) => [airline.iataCode, airline])
    );

    const missingAirlineCodes = airlineCodes.filter(
      (code) => !airlinesInDbMap.has(code)
    );

    let newAirlineDetails = [];

    if (missingAirlineCodes.length > 0) {
      const response = await amadeus.referenceData.airlines.get({
        airlineCodes: missingAirlineCodes.join(),
      });

      newAirlineDetails = (response.data || []).map((data) => ({
        iataCode: data.iataCode,
        icaoCode: data.icaoCode,
        businessName: data.businessName,
        commonName: data.commonName,
      }));

      await Airline.insertMany(newAirlineDetails, { ordered: false });
    }

    newAirlineDetails.forEach((detail) =>
      airlinesInDbMap.set(detail.iataCode, detail)
    );

    const flightsWithAirlineDetails = attachAirlineDetails(
      flights,
      airlinesInDbMap
    );

    flightsWithAirlineDetails.sort((a, b) => {
      const aSegments = a.itineraries[0].segments.length;
      const bSegments = b.itineraries[0].segments.length;
      return aSegments - bSegments;
    });

    return res.status(200).json({
      message: 'Flights list fetched successfully',
      flights: flightsWithAirlineDetails,
    });
  } catch (error) {
    console.error('Error fetching flights list:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

function attachAirlineDetails(flights, airlinesMap) {
  return flights.map((flight) => {
    const airlineDetails = flight.validatingAirlineCodes.map(
      (code) => airlinesMap.get(code) || {}
    );
    return { ...flight, airlineDetails };
  });
}
