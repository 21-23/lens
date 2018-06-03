const connections = new Map(); // key - connectionId, value - participant

function generateConnectionId(participantId, sessionAlias, role, game) {
    return `${game}::${sessionAlias}::${participantId}::${role}`;
}

const lobby = {
    generateConnectionId,
    get: (connectionId) => {
        return connections.get(connectionId);
    },
    remove: (connectionId) => {
        const participant = connections.get(connectionId);

        if (participant && participant.ws) {
            // see "removeAllListeners" implementation in uws
            participant.ws.removeAllListeners('close');
        }

        return !!participant && connections.delete(connectionId);
    },
    add: (connectionId, participant) => {
        participant.ws.once('close', lobby.remove.bind(null, connectionId));

        return connections.set(connectionId, participant);
    },
};

module.exports = lobby;
