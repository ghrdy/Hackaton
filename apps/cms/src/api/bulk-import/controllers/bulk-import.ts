// @ts-nocheck
import { factories } from '@strapi/strapi';
const axios = require('axios');
const { parse } = require('csv-parse/sync');

export default factories.createCoreController('api::bulk-import.bulk-import' as any, ({ strapi }) => ({
  async process(ctx) {
    const { documentId } = ctx.request.body;
    console.log(`🚀 [Process] Démarrage pour ${documentId}`);

    try {
      const entry = await strapi.documents('api::bulk-import.bulk-import' as any).findOne({
        documentId: documentId,
        populate: ['csvFile']
      });

      if (!entry || !entry.csvFile) return ctx.badRequest('Fichier introuvable');

      const fileUrl = entry.csvFile.url.startsWith('http') 
        ? entry.csvFile.url 
        : `http://127.0.0.1:1337${entry.csvFile.url}`;
      
      const response = await axios.get(fileUrl);
      const records = parse(response.data, { columns: true, skip_empty_lines: true, trim: true });

      let created = 0;
      for (const record of records) {
        try {
          let url = record.linkedinUrl || record.url || Object.values(record).find(v => typeof v === 'string' && v.includes('linkedin.com/in/'));
          if (!url) continue;

          await strapi.documents('api::alumnus.alumnus' as any).create({
            data: {
              firstName: record.firstName || record.prenom || 'Nouveau',
              lastName: record.lastName || record.nom || 'Alumni',
              linkedinUrl: url,
              scrapingStatus: 'pending',
              slug: `temp-${Math.random().toString(36).substr(2, 9)}`
            },
            status: 'published'
          });
          created++;
        } catch (e) {}
      }

      await strapi.documents('api::bulk-import.bulk-import' as any).update({
        documentId,
        data: { importStatus: 'completed', report: `Succès : ${created} alumni créés.` }
      });

      return ctx.send({ ok: true });
    } catch (err) {
      console.error('🔥 Erreur:', err.message);
      return ctx.badRequest(err.message);
    }
  }
}));
