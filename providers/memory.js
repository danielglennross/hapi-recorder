'use strict';

class Memory {

  constructor() {
    this.store = [];
  }

  get() {
    return Promise.resolve(this.store);
  }

  publish(route, track) {
    const item = { route, track };
    this.store.push(item);
    return Promise.resolve();
  }
}

module.exports = Memory;
