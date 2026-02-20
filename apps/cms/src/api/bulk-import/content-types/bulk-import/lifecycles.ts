// @ts-nocheck
const axios = require('axios');
const { parse } = require('csv-parse/sync');

export default {
  async afterCreate(event) {
    const { result } = event;

    (async () => {
      try {
        console.log('🏁 Début de l\'importation en arrière-plan...');

        const entry = await (strapi.documents('api::bulk-import.bulk-import' as any) as any).findOne({
          documentId: result.documentId,
          populate: ['csvFile']
        });

        if (!entry || !entry.csvFile || entry.importStatus !== 'pending') return;

        const fileUrl = entry.csvFile.url.startsWith('http') 
          ? entry.csvFile.url 
          : `${strapi.config.get('server.url')}${entry.csvFile.url}`;
        
        const response = await axios.get(fileUrl);
        const csvContent = response.data;

        const records = parse(csvContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        });

        console.log(`📦 ${records.length} lignes détectées.`);

        let createdCount = 0;
        let errorCount = 0;

        for (const record of records) {
          try {
            let linkedinUrl = record.linkedinUrl || record.url || record.Linkedin || record.LinkedIn || record.URL;
            if (!linkedinUrl) {
              const firstKey = Object.keys(record)[0];
              if (firstKey && record[firstKey]?.startsWith('http')) linkedinUrl = record[firstKey];
            }
            
            if (!linkedinUrl) {
              errorCount++;
              continue;
            }

            const firstName = record.firstName || record.prenom || record.Prenom || 'Nouveau';
            const lastName = record.lastName || record.nom || record.Nom || 'Alumni';
            const slug = `${firstName}-${lastName}-${Math.random().toString(36).substring(7)}`
              .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-');

            await (strapi.documents('api::alumnus.alumnus' as any) as any).create({
              data: {
                firstName,
                lastName,
                linkedinUrl,
                scrapingStatus: 'pending', // Champ renommé
                slug
              },
              status: 'published'
            });
            createdCount++;
          } catch (recordErr) {
            console.error('⚠️ Erreur sur une ligne :', recordErr.message);
            errorCount++;
          }
        }

        await (strapi.documents('api::bulk-import.bulk-import' as any) as any).update({
          documentId: result.documentId,
          data: {
            importStatus: 'completed', // Champ renommé
            report: `Succès : ${createdCount} alumni créés. Échecs : ${errorCount}.`
          }
        });

        console.log('✅ Importation terminée !');

      } catch (globalErr) {
        console.error('🔥 Erreur critique :', globalErr.message);
        await (strapi.documents('api::bulk-import.bulk-import' as any) as any).update({
          documentId: result.documentId,
          data: {
            importStatus: 'error',
            report: `Erreur critique : ${globalErr.message}`
          }
        });
      }
    })();
  }
};
