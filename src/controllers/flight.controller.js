const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const flightService = require('../services/flight.service');

exports.addAirlineInfoByCode = catchAsync(async (req, res, next) => {
  const airline = await flightService.addAirlineByCode(req.params.airlineCode);

  res.status(200).json({
    status: 'success',
    data: airline,
  });
});

exports.fetchFlightsList = catchAsync(async (req, res, next) => {
  const flights = await flightService.searchFlights(req.body);

  res.status(200).json({
    status: 'success',
    data: flights,
  });
});
