// @ts-nocheck
const axios = require('axios');

export default {
  async afterCreate(event) {
    const { result } = event;
    
    // Sur Railway, le port interne est souvent 8080 ou 1337
    // On essaie 1337 qui est le port par défaut de Strapi
    const apiUrl = 'http://127.0.0.1:1337/api/bulk-import/process';

    console.log(`⚡️ Triggering process for ${result.documentId}`);

    axios.post(apiUrl, {
      documentId: result.documentId
    }).catch(err => {
      console.error('Trigger failed:', err.message);
    });
  }
};
