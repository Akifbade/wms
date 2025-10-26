import Parse from 'parse/node';

// Initialize Parse SDK
Parse.initialize(
  process.env.PARSE_APP_ID || 'WMS_WAREHOUSE_APP',
  undefined, // JavaScript key (not needed for server)
  process.env.PARSE_MASTER_KEY || 'wms-master-key-change-in-production'
);

Parse.serverURL = process.env.PARSE_SERVER_URL || 'http://localhost:1337/parse';

// Enable master key for all operations (server-side only)
Parse.Cloud.useMasterKey();

console.log('✅ Parse SDK initialized');
console.log('📍 Parse Server URL:', Parse.serverURL);
console.log('🔑 App ID:', process.env.PARSE_APP_ID);

export default Parse;
