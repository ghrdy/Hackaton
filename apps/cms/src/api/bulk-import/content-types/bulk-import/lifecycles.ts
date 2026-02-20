// @ts-nocheck
const axios = require('axios');

export default {
  async afterCreate(event) {
    const { result } = event;
    
    // On récupère le port dynamiquement (Railway utilise souvent 8080)
    const port = process.env.PORT || 1337;
    const apiUrl = `http://127.0.0.1:${port}/api/bulk-import/process`;

    console.log(`⚡️ Triggering process for ${result.documentId} on port ${port}`);

    // Petit délai pour laisser Strapi respirer
    setTimeout(() => {
      axios.post(apiUrl, {
        documentId: result.documentId
      }).catch(err => {
        console.error('Trigger failed:', err.message);
      });
    }, 1000);
  }
};
