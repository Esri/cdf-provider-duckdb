const { processExit } = require('./process-exit');

function handleRequest(request, response) {
  response.status(200).json({ success: true, code: 200 });
  processExit(0);
}

module.exports = handleRequest;
