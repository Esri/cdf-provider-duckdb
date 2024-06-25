const { welcome, shutdown } = require('./request-handlers');

module.exports = [
  {
    path: '/',
    methods: ['get'],
    handler: welcome
  },
  {
    path: '/shutdown',
    methods: ['get'],
    handler: shutdown
  }
];
