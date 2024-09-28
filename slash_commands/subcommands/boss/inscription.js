const { Colors } = require("discord.js");
const {createError} = require("../../../util/envoiMsg");

const inscription = async (interaction, options) => {
  const author = interaction.member;
  const client = interaction.client;

  // test si auteur est register
  const userDb = await client.getUser(author);
  if (!userDb) {
    // Si pas dans la BDD
    return interaction.reply({
      embeds: [
        createError(
          `${author.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``,
        ),
      ],
    });
  }

  // Récupère le role Participant, le créer sinon
  const role = interaction.guild.roles.cache.find(r => r.name === 'Grimpeur');
  if (!role) {
    logger.info(".. rôle 'Grimpeur' pas encore créé, création ..");
    await interaction.guild.roles.create({ name: 'Grimpeur', color: Colors.Green, permissions: [] });
  }

  // Pas besoin de tester si le rôle est déjà ajouté
  await author.roles.add(role || interaction.guild.roles.cache.find(r => r.name === 'Grimpeur'));
  logger.info(`.. ${author.nickname} s'est inscrit et a eu le rôle 'Grimpeur' ..`);
  await interaction.reply({ content: `Tu es inscrit à l'événement et tu as reçu le rôle "Grimpeur".`, ephemeral: true });
}

exports.inscription = inscription;