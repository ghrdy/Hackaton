module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/bulk-import/process',
      handler: 'process.process',
      config: {
        auth: false, // On sécurise via un token interne si besoin, ou on laisse ouvert pour le test (c'est interne au serveur)
        policies: [],
      },
    },
  ],
};
