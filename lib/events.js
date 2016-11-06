'use strict';

const Hoek = require('hoek');

const isRecDisabled = req => !!req.route.settings.plugins.disableRecorder;

const populateUknown = (msgs) => {
  const compare = (a, b) => {
    if (a.timeElaspsed.start < b.timeElaspsed.start) {
      return -1;
    }
    if (a.timeElaspsed.start > b.timeElaspsed.start) {
      return 1;
    }
    return 0;
  };
  const indexOf = (arr, it) => arr.indexOf(arr.filter(x => x.timeElaspsed.start === it.timeElaspsed.start)[0]);
  const fmsgs = Hoek.clone(msgs.sort(compare));
  const itemsToInsert = fmsgs.filter(
    m => indexOf(msgs, m) !== msgs.length - 1 &&
    m.timeElaspsed.end !== msgs[indexOf(msgs, m) + 1].timeElaspsed.start
  ).map(m => ({
    index: indexOf(msgs, m) + 1, // shift to here
    start: m.timeElaspsed.end,
    end: msgs[indexOf(msgs, m) + 1].timeElaspsed.start
  }));
  itemsToInsert.forEach(m => msgs.splice(m.index, 0, {
    message: 'Unknown',
    timeElaspsed: {
      start: m.start,
      end: m.end,
      elapsed: m.end - m.start
    },
    response: 'Unknown'
  }));
};

exports.onRequest = (ns) =>
  (req, reply) => {
    ns.bindEmitter(req.raw.req);
    ns.bindEmitter(req.raw.res);
    ns.run(() => reply.continue());
  };

exports.onPreAuth = (ns) =>
  (req, reply) => {
    ns.set('recorder', {
      isEnabled: !isRecDisabled(req),
      track: []
    });
    return reply.continue();
  };

exports.onPreResponse = (ns, internals) =>
  (req, reply) => {
    const recorder = ns.get('recorder');
    if (!recorder.isEnabled) {
      return reply.continue();
    }

    const track = recorder.track;
    if (!track || !track.length) {
      return reply.continue();
    }

    return Promise.all(track.map(x => x()))
      .then(msgs => {
        populateUknown(msgs);
        internals.logger.logInfo('publish', 'attempting to publish track', track);
        return internals.provider.publish({
          id: Date.now(),
          request: {
            method: req.method,
            headers: req.headers,
            path: req.path,
            payload: req.payload
          }
        }, msgs);
      })
      .then(() => reply.continue())
      .catch(err => {
        internals.logger.logError('publish', 'failed to publish track', err, track);
        return reply.continue();
      });
  };
