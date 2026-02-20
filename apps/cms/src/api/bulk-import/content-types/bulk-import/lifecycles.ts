// @ts-nocheck
const axios = require('axios');

export default {
  async afterCreate(event) {
    const { result } = event;
    
    // URL locale de l'API (localhost car c'est serveur à serveur)
    const apiUrl = 'http://127.0.0.1:1337/api/bulk-import/process';

    console.log(`⚡️ Triggering process for ${result.documentId}`);

    // Fire & Forget : On n'attend pas la réponse
    axios.post(apiUrl, {
      documentId: result.documentId
    }).catch(err => {
      console.error('Trigger failed:', err.message);
    });
  }
};
