require('dotenv').config({ path: '.env.development' });

const mongoose = require('mongoose');
const connectDB = require('./src/utils/db');
const Airline = require('./src/models/Airline');

const airlines = [
  {
    iataCode: 'A3',
    icaoCode: 'AEE',
    businessName: 'Aegean Airlines S.A.',
    commonName: 'Aegean Airlines',
    logo: '/airlines/A3.png',
  },
  {
    iataCode: 'AA',
    icaoCode: 'AAL',
    businessName: 'American Airlines Inc.',
    commonName: 'American Airlines',
    logo: '/airlines/AA.jpg',
  },
  { iataCode: 'AF', icaoCode: 'AFR', businessName: 'Air France', commonName: 'Air France', logo: '/airlines/AF.png' },
  {
    iataCode: 'AI',
    icaoCode: 'AIC',
    businessName: 'Air India Limited',
    commonName: 'Air India',
    logo: '/airlines/AI.jpg',
  },
  { iataCode: 'AY', icaoCode: 'FIN', businessName: 'Finnair Plc', commonName: 'Finnair', logo: '/airlines/AY.png' },
  { iataCode: 'AZ', icaoCode: 'ITY', businessName: 'ITA Airways', commonName: 'ITA Airways', logo: '/airlines/AZ.png' },
  {
    iataCode: 'BA',
    icaoCode: 'BAW',
    businessName: 'British Airways Plc',
    commonName: 'British Airways',
    logo: '/airlines/BA.jpg',
  },
  {
    iataCode: 'EI',
    icaoCode: 'EIN',
    businessName: 'Aer Lingus Limited',
    commonName: 'Aer Lingus',
    logo: '/airlines/EI.jpg',
  },
  {
    iataCode: 'EK',
    icaoCode: 'UAE',
    businessName: 'Emirates Airline',
    commonName: 'Emirates',
    logo: '/airlines/EK.png',
  },
  { iataCode: 'EY', icaoCode: 'ETD', businessName: 'Etihad Airways', commonName: 'Etihad', logo: '/airlines/EY.png' },
  { iataCode: 'FZ', icaoCode: 'FDB', businessName: 'Flydubai', commonName: 'flydubai', logo: '/airlines/FZ.png' },
  { iataCode: 'G9', icaoCode: 'ABY', businessName: 'Air Arabia', commonName: 'Air Arabia', logo: '/airlines/G9.png' },
  { iataCode: 'GF', icaoCode: 'GFA', businessName: 'Gulf Air', commonName: 'Gulf Air', logo: '/airlines/GF.png' },
  {
    iataCode: 'HM',
    icaoCode: 'SEY',
    businessName: 'Air Seychelles Limited',
    commonName: 'Air Seychelles',
    logo: '/airlines/HM.jpg',
  },
  {
    iataCode: 'IB',
    icaoCode: 'IBE',
    businessName: 'Iberia Lineas Aereas de Espana',
    commonName: 'Iberia',
    logo: '/airlines/IB.png',
  },
  {
    iataCode: 'IC',
    icaoCode: 'IAC',
    businessName: 'Indian Airlines',
    commonName: 'Indian Airlines',
    logo: '/airlines/IC.png',
  },
  {
    iataCode: 'KA',
    icaoCode: 'KAC',
    businessName: 'Cathay Dragon',
    commonName: 'Cathay Dragon',
    logo: '/airlines/KA.webp',
  },
  {
    iataCode: 'KL',
    icaoCode: 'KLM',
    businessName: 'KLM Royal Dutch Airlines',
    commonName: 'KLM',
    logo: '/airlines/KL.jpg',
  },
  {
    iataCode: 'KU',
    icaoCode: 'KAC',
    businessName: 'Kuwait Airways',
    commonName: 'Kuwait Airways',
    logo: '/airlines/KU.png',
  },
  {
    iataCode: 'LA',
    icaoCode: 'LAN',
    businessName: 'LATAM Airlines Group',
    commonName: 'LATAM',
    logo: '/airlines/LA.jpg',
  },
  {
    iataCode: 'LH',
    icaoCode: 'DLH',
    businessName: 'Deutsche Lufthansa AG',
    commonName: 'Lufthansa',
    logo: '/airlines/LH.png',
  },
  {
    iataCode: 'LX',
    icaoCode: 'SWR',
    businessName: 'Swiss International Air Lines',
    commonName: 'Swiss',
    logo: '/airlines/LX.png',
  },
  {
    iataCode: 'NW',
    icaoCode: 'NWA',
    businessName: 'Northwest Airlines',
    commonName: 'Northwest Airlines',
    logo: '/airlines/NW.webp',
  },
  {
    iataCode: 'OK',
    icaoCode: 'CSA',
    businessName: 'Czech Airlines',
    commonName: 'Czech Airlines',
    logo: '/airlines/OK.png',
  },
  {
    iataCode: 'OS',
    icaoCode: 'AUA',
    businessName: 'Austrian Airlines AG',
    commonName: 'Austrian Airlines',
    logo: '/airlines/OS.png',
  },
  {
    iataCode: 'QF',
    icaoCode: 'QFA',
    businessName: 'Qantas Airways Limited',
    commonName: 'Qantas',
    logo: '/airlines/QF.png',
  },
  {
    iataCode: 'QR',
    icaoCode: 'QTR',
    businessName: 'Qatar Airways',
    commonName: 'Qatar Airways',
    logo: '/airlines/QR.png',
  },
  {
    iataCode: 'RB',
    icaoCode: 'RBA',
    businessName: 'Royal Brunei Airlines',
    commonName: 'Royal Brunei',
    logo: '/airlines/RB.jpg',
  },
  {
    iataCode: 'SQ',
    icaoCode: 'SIA',
    businessName: 'Singapore Airlines Limited',
    commonName: 'Singapore Airlines',
    logo: '/airlines/SQ.png',
  },
  {
    iataCode: 'SV',
    icaoCode: 'SVA',
    businessName: 'Saudi Arabian Airlines',
    commonName: 'Saudia',
    logo: '/airlines/SV.png',
  },
  {
    iataCode: 'TK',
    icaoCode: 'THY',
    businessName: 'Turk Hava Yollari',
    commonName: 'Turkish Airlines',
    logo: '/airlines/TK.png',
  },
  {
    iataCode: 'UA',
    icaoCode: 'UAL',
    businessName: 'United Airlines Inc.',
    commonName: 'United Airlines',
    logo: '/airlines/UA.jpg',
  },
  { iataCode: 'UK', icaoCode: 'VTI', businessName: 'Vistara', commonName: 'Vistara', logo: '/airlines/UK.jpg' },
  {
    iataCode: 'VS',
    icaoCode: 'VIR',
    businessName: 'Virgin Atlantic Airways',
    commonName: 'Virgin Atlantic',
    logo: '/airlines/VS.png',
  },
  { iataCode: 'WY', icaoCode: 'OMA', businessName: 'Oman Air', commonName: 'Oman Air', logo: '/airlines/WY.png' },
  { iataCode: 'XY', icaoCode: 'KNE', businessName: 'flynas', commonName: 'flynas', logo: '/airlines/XY.png' },
  { iataCode: 'MS', icaoCode: 'MSR', businessName: 'Egyptair', commonName: 'EgyptAir', logo: '/airlines/MS.png' },
  {
    iataCode: 'SA',
    icaoCode: 'SAA',
    businessName: 'South African Airways',
    commonName: 'South African Airways',
    logo: '/airlines/SA.png',
  },
  {
    iataCode: 'KQ',
    icaoCode: 'KQA',
    businessName: 'Kenya Airways',
    commonName: 'Kenya Airways',
    logo: '/airlines/KQ.png',
  },
  {
    iataCode: 'ET',
    icaoCode: 'ETH',
    businessName: 'Ethiopian Airlines',
    commonName: 'Ethiopian Airlines',
    logo: '/airlines/ET.png',
  },
  {
    iataCode: 'AT',
    icaoCode: 'RAM',
    businessName: 'Royal Air Maroc',
    commonName: 'Royal Air Maroc',
    logo: '/airlines/AT.png',
  },
  { iataCode: 'HR', icaoCode: 'HHN', businessName: 'Hahn Air', commonName: 'Hahn Air', logo: '/airlines/HR.png' },
  {
    iataCode: 'HY',
    icaoCode: 'UZB',
    businessName: 'Uzbekistan Airways',
    commonName: 'Uzbekistan Airways',
    logo: '/airlines/HY.png',
  },
  {
    iataCode: 'ME',
    icaoCode: 'MEA',
    businessName: 'Middle East Airlines',
    commonName: 'Middle East Airlines',
    logo: '/airlines/ME.png',
  },
  {
    iataCode: 'RJ',
    icaoCode: 'RJA',
    businessName: 'Royal Jordanian',
    commonName: 'Royal Jordanian',
    logo: '/airlines/RJ.png',
  },
  { iataCode: 'VF', icaoCode: 'TKJ', businessName: 'AJET', commonName: 'AJET', logo: '/airlines/VF.png' },
];

async function migrate() {
  await connectDB('migration');

  let upserted = 0;
  for (const airline of airlines) {
    const result = await Airline.updateOne({ iataCode: airline.iataCode }, { $set: airline }, { upsert: true });
    if (result.upsertedCount || result.modifiedCount) upserted++;
  }

  console.log(`✅ Done. ${upserted} airline(s) inserted or updated with logo.`);

  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
