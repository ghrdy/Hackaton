// @ts-nocheck
const axios = require('axios');
const { parse } = require('csv-parse/sync');

export default {
  async afterCreate(event) {
    const { result } = event;

    // Utilisation de setTimeout pour sortir complètement du contexte de la transaction de création
    setTimeout(async () => {
      try {
        console.log('🏁 Début de l\'importation en arrière-plan...');

        // 1. Récupérer l'entrée complète avec le fichier
        const entry = await (strapi.documents('api::bulk-import.bulk-import' as any) as any).findOne({
          documentId: result.documentId,
          populate: ['csvFile']
        });

        if (!entry || !entry.csvFile) {
          console.error('❌ Aucun fichier trouvé ou entrée introuvable');
          return;
        }

        // 2. Télécharger le contenu du CSV
        const fileUrl = entry.csvFile.url.startsWith('http') 
          ? entry.csvFile.url 
          : `${strapi.config.get('server.url')}${entry.csvFile.url}`;
        
        console.log(`📥 Téléchargement du fichier : ${fileUrl}`);
        const response = await axios.get(fileUrl);
        const csvContent = response.data;

        // 3. Parser le CSV
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
            // Mapping très souple pour les colonnes
            let linkedinUrl = record.linkedinUrl || record.url || record.Linkedin || record.LinkedIn || record.URL || record.link || record.Link;
            
            // Fallback première colonne
            if (!linkedinUrl) {
              const firstKey = Object.keys(record)[0];
              if (firstKey && record[firstKey]?.startsWith('http')) linkedinUrl = record[firstKey];
            }
            
            if (!linkedinUrl) {
              errorCount++;
              continue;
            }

            const firstName = record.firstName || record.prenom || record.Prenom || record.first_name || 'Nouveau';
            const lastName = record.lastName || record.nom || record.Nom || record.last_name || 'Alumni';
            const slug = `${firstName}-${lastName}-${Math.random().toString(36).substring(7)}`
              .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-');

            await (strapi.documents('api::alumnus.alumnus' as any) as any).create({
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
          } catch (recordErr) {
            console.error('⚠️ Erreur sur une ligne :', recordErr.message);
            errorCount++;
          }
        }

        // 4. Mise à jour du rapport final
        await (strapi.documents('api::bulk-import.bulk-import' as any) as any).update({
          documentId: result.documentId,
          data: {
            importStatus: 'completed',
            report: `Succès : ${createdCount} alumni créés. Échecs : ${errorCount}.`
          }
        });

        console.log('✅ Importation terminée avec succès !');

      } catch (globalErr) {
        console.error('🔥 Erreur critique lors de l\'importation :', globalErr.message);
        try {
          // Utilisation du service directement pour éviter les conflits de documents si possible
          await strapi.db.query('api::bulk-import.bulk-import').update({
            where: { documentId: result.documentId },
            data: {
              importStatus: 'error',
              report: `Erreur critique : ${globalErr.message}`
            }
          });
        } catch (updateErr) {
          console.error('Impossible de mettre à jour le statut d\'erreur');
        }
      }
    }, 1000); // Délai de 1 seconde pour être sûr que Strapi a fini sa transaction
  }
};
