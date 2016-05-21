'use strict';

const io     = require('socket.io-client');
const logger = require('logplease').create("orbit-db.Pubsub");

class Pubsub {
  constructor() {
    this._socket = null;
    this._subscriptions = {};
  }

  connect(host, port, username, password) {
    return new Promise((resolve, reject) => {
      if(!this._socket)
        this._socket = io.connect(`http://${host}:${port}`, { 'forceNew': true });

      this._socket.on('connect', resolve);
      this._socket.on('connect_error', (err) => reject(new Error(`Connection refused to Pubsub at '${host}:${port}'`)));
      this._socket.on('disconnect', (socket) => logger.warn(`Disconnected from Pubsub at 'http://${host}:${port}'`));
      this._socket.on('error', (e) => logger.error('Pubsub socket error:', e));
      this._socket.on('message', this._handleMessage.bind(this));
      this._socket.on('subscribed', (dbname, message, peers) => {
        console.log("Got peers:", dbname, message)
        console.log(peers);
        if(this._handleSubscribed) this._handleSubscribed(dbname, message, peers);
        this._handleMessage(dbname, message);
      });
    });
  }

  disconnect() {
    if(this._socket)
      this._socket.disconnect();
  }

  subscribe(id, address, hash, password, callback) {
    if(!this._subscriptions[hash]) {
      this._subscriptions[hash] = { callback: callback };
      this._socket.emit('subscribe', { peerId: id, address: address, channel: hash }); // calls back with 'subscribed' event
    }
  }

  unsubscribe(hash) {
    if(this._subscriptions[hash]) {
      this._socket.emit('unsubscribe', { channel: hash });
      delete this._subscriptions[hash];
    }
  }

  publish(hash, message) {
    if(this._subscriptions[hash])
      this._socket.send(JSON.stringify({ channel: hash, message: message }));
  }

  _handleMessage(hash, message) {
    if(this._subscriptions[hash] && this._subscriptions[hash].callback)
      this._subscriptions[hash].callback(hash, message);
  }
}

module.exports = Pubsub;
