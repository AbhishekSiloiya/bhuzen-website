// Public browser configuration, not a place for passwords or mail-provider secrets.
// A Web3Forms public access key routes delivery; recipient text does not route mail.
export const siteConfig=Object.freeze({
  deliveryEnabled:false,
  recipientVerified:false,
  recipient:'',
  accessKey:'',
  allowedOrigins:[],
  resourcesEnabled:false,
  resourcesCleared:false,
  resourceFulfilment:'pending',
  bookingUrl:'https://calendar.app.google/D4yYD9aEahuF2CeM9'
});
