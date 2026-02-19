// @ts-nocheck
const axios = require('axios');

module.exports = {
  async trigger(ctx) {
    const { frequency } = ctx.request.body;
    
    // GITHUB SETTINGS
    const GITHUB_OWNER = process.env.GITHUB_OWNER || 'timhrdy'; // Replace with your username
    const GITHUB_REPO = process.env.GITHUB_REPO || 'annuaire-alumni'; // Replace with your repo name
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

    if (!GITHUB_TOKEN) {
      return ctx.badRequest('Missing GITHUB_TOKEN');
    }

    try {
      console.log(`🚀 Triggering Scraping Workflow (Frequency: ${frequency})...`);
      
      const response = await axios.post(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/dispatches`,
        {
          event_type: 'scraping-manual-trigger',
          client_payload: {
            frequency: frequency || 'manual' // Pass info to the workflow if needed
          }
        },
        {
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: 'application/vnd.github.v3+json'
          }
        }
      );

      return ctx.send({ message: 'Scraping triggered successfully!', status: response.status });
    } catch (err) {
      console.error('❌ Error triggering GitHub Action:', err.response?.data || err.message);
      return ctx.badRequest('Failed to trigger scraping', { error: err.message });
    }
  }
};
