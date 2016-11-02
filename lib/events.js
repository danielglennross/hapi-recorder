'use strict';

const isRecDisabled = req => !!req.route.settings.plugins.disableRecorder;

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
