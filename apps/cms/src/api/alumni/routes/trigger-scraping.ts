module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/alumni/trigger-scraping',
      handler: 'trigger-scraping.trigger',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
