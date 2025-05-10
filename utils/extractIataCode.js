const extractIataCode = (locationString) => {
  const start = locationString.indexOf("(") + 1;
  const end = locationString.indexOf(")");

  return start > 0 && end > start ? locationString.slice(start, end) : null;
};

module.exports = extractIataCode;
