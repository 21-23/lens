const winston = require('winston');
require('winston-mongodb');

const config = require('./config');

const LOG_DISABLED = 'none';
const LOGGER_ID = 'ROOT';
const transports = [];

const consoleLevel = config.get('LOG:CONSOLE');
const fileLevel = config.get('LOG:FILE');
const dbLevel = config.get('LOG:DB');
const dbUri = config.get('LOG:DBURI');

if (consoleLevel && consoleLevel !== LOG_DISABLED) {
    transports.push(new winston.transports.Console({
        level: consoleLevel,
        colorize: true,
        timestamp: true,
        stderrLevels: ['error'],
    }));
}

if (fileLevel && fileLevel !== LOG_DISABLED) {
    transports.push(new winston.transports.File({
        level: fileLevel,
        dirname: 'logs',
        filename: 'ws-service.log',
        json: true,
        maxsize: 500000,
        maxFiles: 10,
        tailable: true,
        timestamp: true,
    }));
}

if (dbUri && dbLevel && dbLevel !== LOG_DISABLED) {
    transports.push(new winston.transports.MongoDB({
        level: dbLevel,
        db: dbUri,
        collection: 'ws-service-log',
        name: 'ws-service',
        tryReconnect: true,
        decolorize: true,
    }));
}

winston.loggers.add(LOGGER_ID, { transports });

module.exports = winston.loggers.get(LOGGER_ID);
