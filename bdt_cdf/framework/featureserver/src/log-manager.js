const Logger = require('../../logger'); 
let logger = new Logger();
const winnow = require('../../winnow');

module.exports = {
  get logger () {
    return logger;
  },

  setLogger: ({ logger: _logger, logLevel }) => {
    if (_logger) {
      logger = _logger;
      logger.silly('FeatureServer no longer using default logger.');
      winnow.setLogger({ logger });
      return;
    }
  
    if (logLevel) {
      logger = new Logger({ logLevel });
    }
  }
};
