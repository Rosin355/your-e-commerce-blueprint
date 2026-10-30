// CI-only safety net: fail unexpected network calls in Node domain tests.
// Tests may replace fetch with their own stubs. This is not an OS sandbox.
const { syncBuiltinESMExports } = require('node:module');
const deny = () => { throw new Error('CI_NETWORK_DISABLED: domain tests must use local stubs'); };
const http = require('node:http');
const https = require('node:https');
const net = require('node:net');
const tls = require('node:tls');
const dgram = require('node:dgram');
http.request = http.get = https.request = https.get = deny;
net.connect = net.createConnection = net.Socket.prototype.connect = deny;
tls.connect = dgram.createSocket = deny;
globalThis.fetch = async () => deny();
globalThis.WebSocket = class { constructor() { deny(); } };
syncBuiltinESMExports();
