'use strict';

const unixNow = () => (new Date).getTime();

const record = (ns, fn, args, isCb, messageFactory) => {
  const recorder = ns.get('recorder');
  if (!recorder.isEnabled) {
    return fn();
  }

  let endStamp;
  let start;
  let res;

  // fncs using callbacks
  if (isCb) {
    // callback = last func in arguments
    const fnArgs = [].slice.call(args);
    const callbackFns = fnArgs
      .map(x => ({ arg: x, index: fnArgs.indexOf(x) }))
      .filter(x => typeof x.arg === 'function');

    const callbackFn = callbackFns[callbackFns.length - 1];
    const orig = callbackFn.arg;
    callbackFn.arg = function wrappedCallback() {
      let error;
      let result;
      try {
        // eslint-disable-next-line prefer-rest-params
        result = orig.apply(this, arguments);
      } catch (err) {
        error = err;
      }
      endStamp = unixNow();
      const messageTask = () => {
        const factory = messageFactory.bind(null, {
          start,
          end: endStamp,
          elapsed: endStamp - start
        });
        return !error ? factory(null, result) : factory(error, null);
      };

      const track = recorder.track;
      track.push(messageTask);
      ns.set('recorder', recorder); // this might not be needed
      if (error) {
        throw error;
      }
    };
    fnArgs[callbackFn.index] = callbackFn.arg;
    start = unixNow();
    res = fn(fnArgs);
    return res;
  }

  // fncs using promises or objects etc
  start = unixNow();

  let error;
  try {
    res = fn(args);
  } catch (err) {
    error = err;
  }

  if (error || !(res instanceof Promise)) {
    endStamp = unixNow();
    const messageTask = () => {
      const factory = messageFactory.bind(null, {
        start,
        end: endStamp,
        elapsed: endStamp - start
      });
      return !error ? factory(null, res) : factory(error, null);
    };

    const track = recorder.track;
    track.push(messageTask);
    ns.set('recorder', recorder); // this might not be needed
    if (error) {
      throw error;
    }
  } else {
    res.then(
      () => unixNow(),
      () => unixNow()
    )
    .then(end => {
      const messageTask = () => {
        const factory = messageFactory.bind(null, {
          start,
          end,
          elapsed: end - start
        });
        return res.then(val => factory(null, val), err => factory(err, null));
      };

      const track = recorder.track;
      track.push(messageTask);
      ns.set('recorder', recorder); // this might not be needed
    });
  }

  return res;
};

exports.record = (ns) =>
  (fn, messageFactory, isCallback) => {
    const isCb = isCallback || false;
    return record(ns, (fnArgs) => fn.apply(this, fnArgs), arguments, isCb, messageFactory);
  };

exports.recordExp = (ns) =>
  (obj, fnStr, messageFactory, isCallback) => {
    const isCb = isCallback || false;
    const orig = obj[fnStr];
    // eslint-disable-next-line no-param-reassign
    obj[fnStr] = function wrapped() {
      // eslint-disable-next-line prefer-rest-params
      return record(ns, (fnArgs) => orig.apply(this, fnArgs), arguments, isCb, messageFactory);
    };
  };

exports.recordAll = (ns) =>
  (obj, fnToWrap, messageFactory, callbackArray) => {
    const cbArr = callbackArray || []; // arr of method names which use cbs ['method1', 'method2']
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
        const isCb = !!(cbArr.filter(m => m === x)[0]);
        const msgFactory = accFn[x];
        // eslint-disable-next-line prefer-rest-params
        return record(ns, (fnArgs) => orig.apply(this, fnArgs), isCb, arguments, msgFactory);
      };
    });
  };
