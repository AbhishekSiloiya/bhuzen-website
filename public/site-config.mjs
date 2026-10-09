// Public browser configuration, not a place for passwords or mail-provider secrets.
// A Web3Forms public access key routes delivery; recipient text does not route mail.
export const siteConfig=Object.freeze({
  deliveryEnabled:false,
  // Owner corrected the spelling and separate Bhuzen routing was verified on 9 October 2026.
  recipientVerified:true,
  recipient:'aabhisheksiloya708@gmail.com',
  accessKey:'6e792ae7-dbed-46b8-8429-388ea9c6971b',
  allowedOrigins:[],
  resourcesEnabled:false,
  resourcesCleared:false,
  resourceFulfilment:'pending',
  bookingUrl:'https://calendar.app.google/D4yYD9aEahuF2CeM9'
});
