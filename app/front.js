const { verify } = require('./auth');
const back = require('./back');

const { warn } = require('./logger');

const lobby = require('./lobby');
const { rejectConnection } = require('./helpers');

function addToLobby(ws, participantId, sessionAlias, role, game) {
    const connectionId = lobby.generateConnectionId(participantId, sessionAlias, role, game);
    let participant = lobby.get(connectionId);

    if (participant) {
        // if there is already such participant in lobby - remove them
        rejectConnection(participant.ws);
        lobby.remove(connectionId);
    }

    participant = { ws, participantId, sessionAlias, role, game };
    lobby.add(connectionId, participant);

    return connectionId;
}

function handleConnection(ws, upgradeReq) {
    return verify(upgradeReq).then(({ participantId, sessionAlias, role, game }) => {
        // if ws is no longer open - do nothing
        if (ws.readyState !== ws.OPEN) {
            return warn('[lens]', 'New connection closed before verification complete');
        }

        const connectionId = addToLobby(ws, participantId, sessionAlias, role, game);

        back.sessionJoin(connectionId, participantId, sessionAlias, role, game);
    }).catch((err) => {
        warn('[lens]', 'New connection rejected', err);

        return rejectConnection(ws, err.reason);
    });
}

exports.handleConnection = handleConnection;
