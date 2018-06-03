const { warn } = require('./logger');
const { verify } = require('./auth');

function rejectConnection(ws, reason) {
    // prevent client phoenix from reconnect
    // assume that ws has appropriate 'close' handler
    ws.close(4500, reason || '');
}

function handleConnection(ws) {
    return verify().then((() => {

    })).catch((err) => {
        warn('[lens]', 'New connection rejected', err);

        return rejectConnection(ws, err.reason);
    });
}

exports.handleConnection = handleConnection;
