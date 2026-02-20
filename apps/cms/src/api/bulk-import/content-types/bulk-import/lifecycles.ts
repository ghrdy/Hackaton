// @ts-nocheck
const axios = require('axios');
const { parse } = require('csv-parse/sync');

export default {
  async afterCreate(event) {
    const { result } = event;
    const documentId = result.documentId;

    // On sort complètement du flux Strapi pour éviter les conflits de transaction
    setImmediate(async () => {
      try {
        console.log(`🏁 [Background] Début de l'import pour le document : ${documentId}`);

        // 1. Récupérer l'entrée via DB Query (plus stable en background)
        const entry = await strapi.db.query('api::bulk-import.bulk-import').findOne({
          where: { documentId: documentId },
          populate: { csvFile: true }
        });

        if (!entry || !entry.csvFile) {
          console.error('❌ Fichier introuvable ou entrée déjà supprimée');
          return;
        }

        // 2. Téléchargement du CSV
        const fileUrl = entry.csvFile.url.startsWith('http') 
          ? entry.csvFile.url 
          : `${strapi.config.get('server.url')}${entry.csvFile.url}`;
        
        console.log(`📥 Téléchargement : ${fileUrl}`);
        const response = await axios.get(fileUrl);
        const csvContent = response.data;

        // 3. Parsing
        const records = parse(csvContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        });

        console.log(`📦 ${records.length} lignes à traiter.`);

        let createdCount = 0;
        let errorCount = 0;

        for (const record of records) {
          try {
            // Mapping de l'URL LinkedIn (très agressif)
            let linkedinUrl = record.linkedinUrl || record.url || record.LinkedIn || record.URL || record.link || record.Link;
            
            // Si toujours rien, on cherche n'importe quelle valeur qui ressemble à un lien LinkedIn
            if (!linkedinUrl) {
              const values = Object.values(record);
              linkedinUrl = values.find(v => typeof v === 'string' && v.includes('linkedin.com/in/'));
            }

            if (!linkedinUrl) {
              errorCount++;
              continue;
            }

            const firstName = record.firstName || record.prenom || record.first_name || 'Nouveau';
            const lastName = record.lastName || record.nom || record.last_name || 'Alumni';
            const slug = `${firstName}-${lastName}-${Math.random().toString(36).substring(7)}`
              .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-');

            // Création via DB Query pour éviter les conflits
            await strapi.db.query('api::alumnus.alumnus').create({
              data: {
                firstName,
                lastName,
                linkedinUrl,
                scrapingStatus: 'pending',
                slug,
                publishedAt: new Date() // Force la publication en DB
              }
            });
            createdCount++;
          } catch (rowErr) {
            console.error('⚠️ Erreur ligne :', rowErr.message);
            errorCount++;
          }
        }

        // 4. Update final du statut
        await strapi.db.query('api::bulk-import.bulk-import').update({
          where: { documentId: documentId },
          data: {
            importStatus: 'completed',
            report: `Terminé. ${createdCount} créés, ${errorCount} erreurs.`
          }
        });

        console.log('✅ Importation terminée en arrière-plan !');

      } catch (err) {
        console.error('🔥 Erreur fatale importation :', err.message);
        try {
          await strapi.db.query('api::bulk-import.bulk-import').update({
            where: { documentId: documentId },
            data: {
              importStatus: 'error',
              report: `Erreur : ${err.message}`
            }
          });
        } catch (e) {}
      }
    });
  }
};
