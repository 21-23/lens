const WebSocketClient = require('uws');
const createPhoenix = require('phoenix');
const { parseMessage, arnaux, protocol: { wsService, stateService, initService, ui, identity } } = require('message-factory');

const { getProfiles } = require('./auth');

const config = require('./config');
const logger = require('./logger');

const lobby = require('./lobby');
const hall = require('./hall');
const { rejectConnection, clearConnection, role } = require('./helpers');

const { MESSAGE_NAME } = wsService;
const { error, warn, info } = logger;
let phoenix = null;

// region send message helpers

function sendToGameMasters(sessionId, message) {
    hall.getMasters(sessionId).forEach(({ ws }) => {
        ws.send(message);
    });
}

function sendToPlayers(sessionId, message) {
    hall.getPlayers(sessionId).forEach(({ ws }) => {
        ws.send(message);
    });
}

function sendToSession(sessionId, message) {
    hall.getAll(sessionId).forEach(({ ws }) => {
        ws.send(message);
    });
}

function sendToParticipant(ws, message) {
    ws.send(message);
}

// endregion

function parseClientMessage(incomingMessage) {
    try {
        const { message } = parseMessage(incomingMessage);

        return message;
    } catch (err) {
        error('[lens]', 'Invalid message from client; Skip it;', incomingMessage);
    }

    return null;
}

function addToHall(sessionId, { ws, participantId, role }) {
    const participant = hall.get(null, participantId, sessionId, role);

    if (participant) {
        // if there is already such participant in the hall
        // reject old connection, remove from hall, add a new one
        const oldWs = participant.ws;

        clearConnection(oldWs);
        rejectConnection(oldWs, 'Participant has been identified for another connection');
        hall.remove(oldWs);
    }

    hall.add(ws, participantId, sessionId, role);
    ws.once('close', () => {
        // do not pass participantId and sessionId
        // a new connection with this info may already be added
        // need to search by ws only
        clearConnection(ws);
        hall.remove(ws);
        phoenix.send(stateService.sessionLeave(sessionId, participantId));
    });
    ws.on('message', function onClientMessage(incomingMessage) {
        const message = parseClientMessage(incomingMessage);

        if (!message) {
            return rejectConnection(ws, 'Empty or invalid message');
        }

        handleClientMessage(ws, message);
    });
}

// region back communication

function participantIdentified(connectionId, participantId, sessionId) {
    const participant = lobby.get(connectionId);

    if (!participant) {
        warn('[lens]', 'Unknown participant identification', connectionId, participantId, sessionId);

        // disconnect may happen during the time state service identifies the participant;
        // just in case - send back sessionLeave
        return phoenix.send(stateService.sessionLeave(sessionId, participantId));
    }

    lobby.remove(connectionId);

    if (!sessionId || !participantId) {
        logger.warn('[lens]', 'Participant identification failed:', connectionId, participantId, sessionId);
        return rejectConnection(participant.ws, `State Service auth failed: ${participantId}, ${sessionId}`);
    }

    addToHall(sessionId, participant);

    if (participant.role === role.GAME_MASTER) {
        // it is not required to send participantJoined if a new GM is connected
        return info('[lens]', 'New GM joined', sessionId, participant);
    }

    getProfiles([participant.participantId]).then(([profile]) => {
        return sendToGameMasters(sessionId, ui.participantJoined(participant.participantId, profile.displayName));
    });
}

// endregion

function processServerMessage(message) {
    switch (message.name) {
        case MESSAGE_NAME.sessionJoinResult:
            return participantIdentified(message.connectionId, message.participantId, message.sessionId);
        default:
            return error('[lens]', 'Unknown message from the back', message);
    }
}

// region front communication

function sessionJoin(connectionId, participantId, sessionAlias, role, game) {
    return phoenix.send(stateService.sessionJoin(connectionId, game, sessionAlias, participantId, role));
}

// endregion

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
exports.sessionJoin = sessionJoin;
