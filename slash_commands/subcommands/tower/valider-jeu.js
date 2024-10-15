const { createError } = require("../../../util/envoiMsg");
const { HIDDEN_BOSS, BOSS, ETAGE_PAR_PALIER, MAX_ETAGE, ASCII_FIRST } = require("../../../data/event/tower/constants.json")
const { EventBoss, GuildConfig} = require("../../../models");
const { EmbedBuilder } = require("discord.js");

// Créer un boss si aucun n'existe
async function createBoss(season, isHiddenBoss) {
  const infoBoss = isHiddenBoss ? HIDDEN_BOSS : BOSS;

  const newBoss = await new EventBoss({
    name: infoBoss.name,
    hp: infoBoss.hp,
    maxHp: infoBoss.hp,
    season: season,
    hidden: isHiddenBoss
  });

  await newBoss.save();
  return newBoss;
}

// Créer et renvoie un embed
async function createEmbed(option) {
  return new EmbedBuilder()
    .setTitle(option.title)
    .setDescription(option.desc)
    .setColor(option.color)
    .setURL(option.url)
    .setFooter(option.footer);

}

const validerJeu = async (interaction, options) => {
  // TODO autoriser seulement si dans bon salon ?
  const guildId = interaction.guildId;
  let appid = options.get("appid")?.value;
  appid = !appid ? options.get("jeu")?.value : appid;

  if (!appid) {
    return await interaction.reply("Tu dois spécifier au moins un appID ou chercher le jeu que tu as complété.");
  }
  const author = interaction.member;
  const client = interaction.client;

  // Récupérer l'utilisateur
  const userDb = await client.getUser(author);
  if (!userDb) {
    // Si pas dans la BDD
    return await interaction.reply({
      embeds: [
        createError(
          `${author.user.tag} n'a pas encore de compte ! Pour s'enregistrer : \`/register\``,
        ),
      ],
    });
  }

  const steamId = userDb.steamId;

  // TODO tester si le boss est en vie, sinon RAF
  const season = await GuildConfig.find({ guildId: guildId }).sort({ season: -1 }).limit(1)?.season || 0;
  // TODO gestion erreur
  const { error, gameName, hasAllAchievements } = await client.hasAllAchievementsUnlocked(steamId, appid);

  if (error) {
    // Recup nom du jeu, si présent dans la bdd
    const gameDb = await client.findGameByAppid(appid);
    // TODO ephemeral
    return await interaction.reply(`${gameDb?.name} n'a même pas de succès..`);
  }

  if (hasAllAchievements) {
    // Vérifier si l'utilisateur a déjà 100% le jeu
    // TODO
    // if (userDb.event.tower.completedGames.includes(appid)) {
    // // TODO ephemeral
    //   return await interaction.reply("Tu as déjà utilisé ce jeu.. ce n'est pas très efficace.");
    // }

    userDb.event.tower.etage += 1;  // On monte d'un étage
    // userDb.event.tower.completedGames.push(appid);  // Ajouter l'appId aux jeux déjà 100%
    await userDb.save();

    // Si l'utilisateur n'est pas encore arrivé au boss
    if (userDb.event.tower.etage < MAX_ETAGE) {
      // TODO ephemeral
      // await interaction.reply(`${author} as complété **${gameName}** et monte d'un étage ! (Étage ${userDb.event.tower.etage})`);
      // TODO embed general, mais juste avec le nom du jeu

      if (userDb.event.tower.etage === 1) {
        // 1er message d'intro
        // TODO mettre message ASCII autre part pour + de lisibiltié
        return interaction.reply({
          embeds: [await createEmbed({
            title: `🏆 ${gameName} terminé !`,
            url: `https://store.steampowered.com/app/${appid}/`,
            desc: `En complétant **${gameName}**, ${author} ressent assez d'énergie pour pénétrer dans la tour, et gravir les escalier, pour atteindre le premier **étage** !
${ASCII_FIRST}`,
            color: '#1cff00',
            footer: {
              text: 'Étage 1'
            }
          })]
        });
      }

      // Vérifier si l'utilisateur atteint un nouveau palier (10 étages)
      if (userDb.event.tower.etage % ETAGE_PAR_PALIER === 0) {
        // TODO message général vers salon
        // TODO revoir message
        await interaction.followUp(`${author} passes au palier **${userDb.event.tower.etage / ETAGE_PAR_PALIER}** !`);
      }

      // Si l'utilisateur est arrivé à l'étage du boss
      if (userDb.event.tower.etage === MAX_ETAGE) {
        // TODO message général vers salon
        const bossCreated = await EventBoss.exists({ season: season, hidden: false });
        // Si boss pas créé, on le crée
        if (!bossCreated) {
          const newBoss = await createBoss(season, false);
          await interaction.followUp(`${author} est arrivé au sommet de la tour ! ${author} aperçoit au loin une ombre menaçante.\n
            En se rapprochant, ${author} reconnait très clairement le cupide \`${newBoss.name}\`..\n
            Attention, il fonce droit sur vous !!`);
        } else {
          const hiddenBossCreated = await EventBoss.exists({ season: season, hidden: true });

          // Si boss caché créé ou pas encore, on rejoint le combat contre le 1er ou 2eme
          if (!hiddenBossCreated) {
            await interaction.followUp(`${author} est arrivé au sommet de la tour, la bataille fait rage.\n
              ${author} prends part au combat !`);
          } else {
            const deadBoss = await EventBoss.findOne({ season: season, hp: { $ne: 0 }, hidden: false });
            await interaction.followUp(`${author} est arrivé au sommet de la tour, en trébuchant sur le corps de \`${deadBoss.name}\`.\n
              En se relevant, ${author} voit ses coéquipiers faire face au grand \`Haiepique Fayl\`\n
              ${author} prends part au combat !`);
          }
        }

        // TODO ASCII ? MessageEmbed avec image + "barre de vie" ?
      }
    } else {
      // Récupère le boss courant non mort
      const currentBoss = await EventBoss.findOne({ season: season, hp: { $ne: 0 } });

      // Mettre à jour les dégâts infligés et enregistrer
      const damage = 1;  // modifiable ?
      userDb.event.tower.totalDamage += damage;  // On tape le tower
      await userDb.save();

      currentBoss.hp -= damage;
      if (currentBoss.hp <= 0) {
        if (currentBoss.hidden) {
          // TODO si boss caché meurt, on arrête TOUT et on backup la saison
          await interaction.reply(`${author} a tué \`${currentBoss.name}\` !
          Le calme est revenu et vous êtes maintenant seul. C'est la fin..`);

        } else {
          // - si 1er boss dead, gestion du boss caché
          const hiddenBoss = await createBoss(season, true);

          await interaction.reply(`${author} a tué \`${currentBoss.name}\` !
          Alors que son corps tombe à terre, ${author} entends grogner au loin..
          C'est \`${hiddenBoss.name}\`, son acolyte, qui bondit et qui veut venger son maître !`);

        }
      } else {
        await interaction.reply(`${author} a complété **${gameName}** et inflige ${damage} de damages ! Et paf !`);
      }

      await currentBoss.save();

    }
  } else {
    // TODO MessageEmbed
    await interaction.reply(`Tu n'as pas encore complété **${gameName}**..`);
  }
}

exports.validerJeu = validerJeu;