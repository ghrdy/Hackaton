// @ts-nocheck
const axios = require('axios');
const { parse } = require('csv-parse/sync');

module.exports = {
  async process(ctx) {
    const { documentId } = ctx.request.body;

    console.log(`🚀 [Process Controller] Démarrage import pour ${documentId}`);

    try {
      // 1. Récupération via Document Service (Contexte sain ici !)
      const entry = await strapi.documents('api::bulk-import.bulk-import').findOne({
        documentId: documentId,
        populate: ['csvFile']
      });

      if (!entry || !entry.csvFile) {
        return ctx.badRequest('Fichier introuvable');
      }

      // 2. Téléchargement
      const fileUrl = entry.csvFile.url.startsWith('http') 
        ? entry.csvFile.url 
        : `${strapi.config.get('server.url')}${entry.csvFile.url}`;
      
      const response = await axios.get(fileUrl);
      const records = parse(response.data, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      console.log(`📦 ${records.length} lignes à traiter.`);

      let createdCount = 0;
      let errorCount = 0;

      for (const record of records) {
        try {
          // Mapping agressif
          let linkedinUrl = record.linkedinUrl || record.url || record.Linkedin || record.URL || record.link;
          
          if (!linkedinUrl) {
            const values = Object.values(record);
            linkedinUrl = values.find(v => typeof v === 'string' && v.includes('linkedin.com/in/'));
          }

          if (!linkedinUrl) {
            errorCount++;
            continue;
          }

          const firstName = record.firstName || record.prenom || 'Nouveau';
          const lastName = record.lastName || record.nom || 'Alumni';
          const slug = `${firstName}-${lastName}-${Math.random().toString(36).substring(7)}`
            .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-');

          // Création propre via Document Service v5
          await strapi.documents('api::alumnus.alumnus').create({
            data: {
              firstName,
              lastName,
              linkedinUrl,
              scrapingStatus: 'pending',
              slug
            },
            status: 'published'
          });
          createdCount++;
        } catch (e) {
          console.error('Ligne erreur:', e.message);
          errorCount++;
        }
      }

      // 3. Mise à jour finale
      await strapi.documents('api::bulk-import.bulk-import').update({
        documentId: documentId,
        data: {
          importStatus: 'completed',
          report: `Terminé : ${createdCount} créés, ${errorCount} ignorés.`
        }
      });

      return ctx.send({ message: 'Import terminé' });

    } catch (err) {
      console.error('🔥 Erreur Process:', err);
      // Tentative de log de l'erreur
      try {
        await strapi.documents('api::bulk-import.bulk-import').update({
          documentId: documentId,
          data: { importStatus: 'error', report: err.message }
        });
      } catch(e) {}
      
      return ctx.badRequest(err.message);
    }
  }
};
