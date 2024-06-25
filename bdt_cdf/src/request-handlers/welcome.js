function handleRequest(request, response) {
  response.status(200).send('Welcome to Customdata Server!');
}

module.exports = handleRequest;
