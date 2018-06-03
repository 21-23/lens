const { role } = require('./helpers');

function ensureSession(sessions, sessionId) {
    let session = sessions.get(sessionId);

    if (session) {
        return session;
    }

    session = {
        masters: new Map(),
        players: new Map(),
    };
    sessions.set(sessionId, session);

    return session;
}

function add(connections, sessions, ws, participantId, sessionId, role) {
    const session = ensureSession(sessions, sessionId);

    if (role === role.GAME_MASTER) {
        session.masters.set(participantId, ws);
    } else {
        session.players.set(participantId, ws);
    }

    connections.set(ws, { participantId, sessionId, role });

    return true;
}

function getParticipants(connections, sessions, role, sessionId) {
    const session = sessions.get(sessionId);
    const participants = [];

    if (!session) {
        return participants;
    }

    const map = role === role.GAME_MASTER ? session.masters : session.players;

    map.forEach((ws, participantId) => {
        participants.push({ ws, participantId, sessionId, role });
    });

    return participants;
}

function getAll(connections, sessions, sessionId) {
    const session = sessions.get(sessionId);
    const participants = [];

    if (!session) {
        return participants;
    }

    session.masters.forEach((ws, participantId) => {
        participants.push({ ws, participantId, sessionId, role: role.GAME_MASTER });
    });
    session.players.forEach((ws, participantId) => {
        participants.push({ ws, participantId, sessionId, role: role.PLAYER });
    });

    return participants;
}

function find(connections, sessions, ws, participantId, sessionId, role) {
    if (connections.size === 0 && sessions.size === 0) {
        return null;
    }

    if (ws) {
        const info = connections.get(ws);

        if (info) {
            return Object.assign({ ws }, info);
        }
    }

    if (participantId && sessionId) {
        const session = sessions.get(sessionId);

        if (session) {
            if (role) {
                const map = role === role.GAME_MASTER ? session.masters : session.players;
                const ws = map.get(participantId);

                if (ws) {
                    return { ws, participantId, sessionId, role };
                }
            } else {
                let ws = session.masters.get(participantId);
                let role = role.GAME_MASTER;

                if (!ws) {
                    ws = session.players.get(participantId);
                    role = role.PLAYER;
                }

                if (ws) {
                    return { ws, participantId, sessionId, role };
                }
            }
        }
    }

    return null;
}

function remove(connections, sessions, ws, participantId, sessionId, role) {
    const participant = find(connections, sessions, ws, participantId, sessionId, role);

    if (!participant) {
        return false;
    }

    const session = sessions.get(participant.sessionId);

    if (session) {
        const map = participant.role === role.GAME_MASTER ? session.masters : session.players;
        map.delete(participant.participantId);
    }

    connections.delete(participant.ws);

    return true;
}

module.exports = function () {
    const connections = new Map();
    const sessions = new Map();

    return {
        add: add.bind(null, connections, sessions),
        remove: remove.bind(null, connections, sessions),
        getMasters: getParticipants.bind(null, connections, sessions, role.GAME_MASTER),
        getPlayers: getParticipants.bind(null, connections, sessions, role.PLAYER),
        getAll: getAll.bind(null, connections, sessions),
        get: find.bind(null, connections, sessions),
    };
};
