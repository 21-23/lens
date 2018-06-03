const url = require('url');

const request = require('request-promise-native');

const config = require('./config');
const { role, DEFAULT_PROFILE } = require('./helpers');

let ENABLE_GUNSLINGERS = config.get('GUNSLINGERS');
ENABLE_GUNSLINGERS = ENABLE_GUNSLINGERS === true || ENABLE_GUNSLINGERS === 'true';

// TODO: move gunslingers to front-service? to involve more components in testing
function verifyGunslinger(upgradeReq) {
    const parsedUrl = url.parse(upgradeReq.url, true);

    if (parsedUrl.pathname !== '/gunslinger' || !parsedUrl.query) {
        // regular verification
        return verify(upgradeReq);
    }

    // gunslinger
    const { id: uid, session: sessionAlias, game } = parsedUrl.query;

    if (!uid || !sessionAlias || !game) {
        return Promise.reject({ reason: `Not enough params: ${uid}, ${sessionAlias}, ${game}` });
    }

    // all gunslingers are PLAYERs
    return Promise.resolve({ participantId: uid, sessionAlias, role: role.PLAYER, game });
}

function verify(upgradeReq) {
    const cookie = upgradeReq.headers.cookie;

    if (!cookie) {
        return Promise.reject({ reason: 'No cookie found in request' });
    }

    // the response contains { participantId, sessionAlias, role, game }
    return request({
        uri: config.get('AUTHREMOTE:VERIFY'),
        qs: { cookie },
        json: true,
    }).catch((err) => {
        let reason = '';

        if (!err) {
            reason = 'Unknown error';
        } else if (err.name === 'RequestError') {
            reason = 'Request to remote auth failed';
        } else if (err.message) {
            reason = err.message;
        }

        return Promise.reject({ reason });
    });
}

function getProfiles(participantIds) {
    if (!Array.isArray(participantIds) || !participantIds.length) {
        return Promise.resolve([]);
    }

    return request({
        uri: config.get('AUTHREMOTE:PROFILES'),
        qs: { participantIds },
        json: true,
    }).then((profiles) => {
        return profiles.map((profile, index) => {
            // in most cases "profile" will exist => main flow is not affected;
            // mix in displayName for gunslingers;
            return profile || Object.assign({}, DEFAULT_PROFILE, { displayName: participantIds[index] });
        });
    }).catch((err) => {
        warn('[lens]', 'Error in profile loading', err);

        return Array(participantIds.length).fill(DEFAULT_PROFILE);
    });
}

exports.verify = ENABLE_GUNSLINGERS ? verifyGunslinger : verify;
exports.getProfiles = getProfiles;
