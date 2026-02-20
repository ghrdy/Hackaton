// @ts-nocheck
const axios = require('axios');
const { parse } = require('csv-parse/sync');

module.exports = {
  async afterCreate(event) {
    const { result } = event;

    // 1. Get the file details
    const entry = await strapi.documents('api::bulk-import.bulk-import').findOne({
      documentId: result.documentId,
      populate: ['csvFile']
    });

    if (!entry.csvFile || entry.status !== 'pending') return;

    try {
      console.log('🏁 Starting Bulk Import from CSV...');
      
      // 2. Download CSV content
      const fileUrl = entry.csvFile.url.startsWith('http') 
        ? entry.csvFile.url 
        : `${strapi.config.get('server.url')}${entry.csvFile.url}`;
      
      const response = await axios.get(fileUrl);
      const csvContent = response.data;

      // 3. Parse CSV
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      console.log(`📦 Found ${records.length} records to process.`);

      let createdCount = 0;
      let skippedCount = 0;

      for (const record of records) {
        const linkedinUrl = record.linkedinUrl || record.url;
        if (!linkedinUrl) {
          skippedCount++;
          continue;
        }

        // Simple name extraction if only linkedinUrl is provided
        const firstName = record.firstName || 'New';
        const lastName = record.lastName || 'Alumnus';
        
        // Generate a temporary slug
        const slug = `${firstName}-${lastName}-${Math.random().toString(36).substring(7)}`
          .toLowerCase().replace(/[^a-z0-9]+/g, '-');

        // Create Alumnus in pending state
        await strapi.documents('api::alumnus.alumnus').create({
          data: {
            firstName,
            lastName,
            linkedinUrl,
            status: 'pending',
            slug
          }
        });
        createdCount++;
      }

      // 4. Update Import Status
      await strapi.documents('api::bulk-import.bulk-import').update({
        documentId: result.documentId,
        data: {
          status: 'completed',
          report: `Success: Created ${createdCount} alumni. Skipped ${skippedCount} invalid records.`
        }
      });

      console.log('✅ Bulk Import Finished!');

    } catch (err) {
      console.error('❌ Bulk Import Error:', err.message);
      await strapi.documents('api::bulk-import.bulk-import').update({
        documentId: result.documentId,
        data: {
          status: 'error',
          report: `Error: ${err.message}`
        }
      });
    }
  }
};
