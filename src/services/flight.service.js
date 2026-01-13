const Airline = require('../models/Airline');
const amadeus = require('../utils/amadeus');
const extractIataCode = require('../utils/extractIataCode');
const AppError = require('../utils/appError');

exports.addAirlineByCode = async (airlineCode) => {
  const exists = await Airline.findOne({ iataCode: airlineCode });
  if (exists) {
    throw new AppError('This airline data already exists', 409);
  }

  const response = await amadeus.referenceData.airlines.get({
    airlineCodes: airlineCode,
  });

  const [data] = response.data || [];
  if (!data || !data.icaoCode || data.businessName === 'UNDEFINED') {
    throw new AppError('No airline found', 404);
  }

  return Airline.create({
    iataCode: data.iataCode,
    icaoCode: data.icaoCode,
    businessName: data.businessName,
    commonName: data.commonName,
  });
};

exports.searchFlights = async ({ type, from, to, departureDate, returnDate }) => {
  if (!from || !to || !departureDate) {
    throw new AppError('Please provide departure, arrival, and departure date', 400);
  }

  const params = {
    originLocationCode: extractIataCode(from),
    destinationLocationCode: extractIataCode(to),
    departureDate,
    adults: 1,
    ...(type === 'Return' && returnDate ? { returnDate } : {}),
  };

  const response = await amadeus.shopping.flightOffersSearch.get(params);
  if (!response?.data) throw new AppError('No flights available', 404);

  let flights = response.data.filter((f) => f.itineraries[0].segments.length <= 2);

  return enrichFlightsWithAirlines(flights);
};

async function enrichFlightsWithAirlines(flights) {
  const airlineCodes = [...new Set(flights.flatMap((f) => f.validatingAirlineCodes))];

  const airlinesInDb = await Airline.find({
    iataCode: { $in: airlineCodes },
  });

  const airlineMap = new Map(airlinesInDb.map((a) => [a.iataCode, a]));

  const missingCodes = airlineCodes.filter((code) => !airlineMap.has(code));

  if (missingCodes.length) {
    const response = await amadeus.referenceData.airlines.get({
      airlineCodes: missingCodes.join(),
    });

    const newAirlines = (response.data || []).map((a) => ({
      iataCode: a.iataCode,
      icaoCode: a.icaoCode,
      businessName: a.businessName,
      commonName: a.commonName,
    }));

    await Airline.insertMany(newAirlines, { ordered: false });
    newAirlines.forEach((a) => airlineMap.set(a.iataCode, a));
  }

  return flights
    .map((flight) => ({
      ...flight,
      itineraries: flight.itineraries.map((it) => ({
        ...it,
        segments: it.segments.map((seg) => ({
          ...seg,
          airlineDetail: airlineMap.get(seg.carrierCode) || {},
        })),
      })),
      airlineDetails: flight.validatingAirlineCodes.map((code) => airlineMap.get(code) || {}),
    }))
    .sort((a, b) => a.itineraries[0].segments.length - b.itineraries[0].segments.length);
}
