const WebSocketClient = require('uws');
const createPhoenix = require('phoenix');
const { parseMessage, arnaux, protocol: { frontService, stateService, initService, ui, identity } } = require('message-factory');

const config = require('./config');
const logger = require('./logger');

const { error, info } = logger;
let phoenix = null;

function processServerMessage() {

}

function init() {
    phoenix = createPhoenix(WebSocketClient, {
        uri: config.get('ARNAUX:URL'),
        logger,
        strategy: createPhoenix.strategies.fibonacci,
    });

    phoenix
        .on('connected', () => {
            info('[lens]', 'phoenix is alive');
            phoenix.send(arnaux.checkin(identity.WS_SERVICE));
        })
        .on('disconnected', () => {
            error('[lens]', 'phoenix disconnected');
        })
        .on('message', (incomingMessage) => {
            const { message } = parseMessage(incomingMessage.data);

            processServerMessage(message);
        });
}

exports.init = init;
