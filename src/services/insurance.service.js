const catchAsync = require('../utils/catchAsync');

const URL = 'https://admin.uat.wisdevelopments.com/api/v1/quote/outbound';
const agency_id = '129';
const agency_code = '3JKuGdfj';

exports.fetchWISInsuranceQuotes = async (data) => {
  const formattedData = { agency_id, agency_code, ...data };

  formattedData.group = data.group === 'group' ? 2 : 1;
  formattedData.family = data.group === 'family' ? 2 : 1;

  const res = await fetch(`${URL}/premium`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formattedData),
  });

  const json = await res.json();

  return json.result.quotes;
};
