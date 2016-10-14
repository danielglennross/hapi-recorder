'use strict';

class Memory {
  
  constructor() {
    this.store = {};
  }
  
  get() {
    return Promise.resolve(this.store);
  }

  publish(id, track) {
    return Promise.resolve(Object.assign(this.store, {
      [id]: track
    }));
  }
}

module.exports = Memory;
