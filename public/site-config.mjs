// Public browser configuration, not a place for passwords or mail-provider secrets.
// A Web3Forms public access key routes delivery; recipient text does not route mail.
export const siteConfig=Object.freeze({
  deliveryEnabled:false,
  // Owner confirmed this spelling on 8 October 2026; provider routing is still pending.
  recipientVerified:true,
  recipient:'aabhisheksiloiya708@gmail.com',
  accessKey:'',
  allowedOrigins:[],
  resourcesEnabled:false,
  resourcesCleared:false,
  resourceFulfilment:'pending',
  bookingUrl:'https://calendar.app.google/D4yYD9aEahuF2CeM9'
});
