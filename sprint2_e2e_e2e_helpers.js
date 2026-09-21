'use strict';
const { bootstrap } = require('./backend/src/app');

let server = null;
let base = '';

function boot() {
  return new Promise((resolve, reject) => {
    bootstrap()
      .then((app) => {
        server = app.listen(0, '127.0.0.1', () => {
          base = 'http://127.0.0.1:' + server.address().port;
          resolve(base);
        });
      })
      .catch(reject);
  });
}

function close() {
  return new Promise((resolve) => {
    if (server) server.close(resolve);
    else resolve();
  });
}

async function send(method, u, body, token) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers.Authorization = 'Bearer ' + token;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(base + u, opts);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) { /* raw */ }
  return { status: res.status, json, text };
}

module.exports = { boot, close, send };