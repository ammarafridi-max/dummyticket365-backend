const router = require('express').Router();
const ticketRoutes = require('./ticket.routes');
const insuranceRoutes = require('./insurance.routes');
const airportRoutes = require('./airport.routes');
const flightRoutes = require('./flight.routes');
const userRoutes = require('./user.routes');
const emailRoutes = require('./email.routes');
const blogRoutes = require('./blog.routes');
const authRoutes = require('./auth.routes');

router.use('/ticket', ticketRoutes);
router.use('/insurance', insuranceRoutes);
router.use('/airports', airportRoutes);
router.use('/flights', flightRoutes);
router.use('/users', userRoutes);
router.use('/email', emailRoutes);
router.use('/blogs', blogRoutes);
router.use('/auth', authRoutes);

module.exports = router;
