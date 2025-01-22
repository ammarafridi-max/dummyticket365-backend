function formatDubaiTime(date) {
  const options = {
    timeZone: "Asia/Dubai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };
  return new Intl.DateTimeFormat("en-US", options).format(date);
}

module.exports = formatDubaiTime;
