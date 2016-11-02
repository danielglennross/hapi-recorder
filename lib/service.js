'use strict';

const Hoek = require('hoek');

const unixNow = () => (new Date).getTime();

const record = (ns, fn, messageFactory) => {
  const recorder = ns.get('recorder');
  if (!recorder.isEnabled) {
    return fn();
  }

  const start = unixNow();
  const res = fn();

  let endStamp;
  let resCopy;
  if (!(res instanceof Promise)) {
    endStamp = unixNow();
    resCopy = Promise.resolve(Hoek.clone(res));
  } else {
    resCopy = res;
  }

  resCopy.then(
    () => endStamp || unixNow(),
    () => unixNow()
  )
  .then(end => {
    const messageTask = () => {
      const factory = messageFactory.bind(null, {
        start,
        end,
        elapsed: end - start
      });
      return resCopy.then(val => factory(null, val), err => factory(err, null));
    };

    const track = recorder.track;
    track.push(messageTask);
    ns.set('recorder', recorder); // this might not be needed
  });

  return res;
};

exports.record = (ns) =>
  (fn, messageFactory) =>
    record(ns, fn, messageFactory);

exports.recordExp = (ns) =>
  (obj, fnStr, messageFactory) => {
    const orig = obj[fnStr];
    // eslint-disable-next-line no-param-reassign
    obj[fnStr] = function wrapped() {
      // eslint-disable-next-line prefer-rest-params
      return record(ns, () => orig.apply(this, arguments), messageFactory);
    };
  };

exports.recordAll = (ns) =>
  (obj, fnToWrap, messageFactory) => {
    const prototype = Object.getPrototypeOf(obj);
    const op = Object.getOwnPropertyNames(prototype);

    // ['method1', {method2: () => {}}]
    const accFn = fnToWrap.reduce((acc, fn) => {
      const prop = typeof fn !== 'object'
        ? { [fn]: messageFactory.bind(null, fn) } // bind fn as category
        : fn;
      return (Object.assign(acc, prop), acc);
    }, {});

    const wrap = op.filter(x => Object.keys(accFn).indexOf(x) > -1);
    wrap.forEach(x => {
      const orig = prototype[x];
      prototype[x] = function wrapped() {
        const msgFactory = accFn[x];
        // eslint-disable-next-line prefer-rest-params
        return record(ns, () => orig.apply(this, arguments), msgFactory);
      };
    });
  };
