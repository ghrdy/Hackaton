module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/bulk-import/process',
      handler: 'api::bulk-import.bulk-import.process',
      config: {
        auth: false,
        policies: [],
      },
    },
  ],
};
