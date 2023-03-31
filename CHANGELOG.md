# Changelog

## [Unreleased]

## [v1.2.4]
- Ajout de la commande `/avertissement`, qui, au bout de 3, interdit l'utilisateur a créer/rejoindre un groupe

## [v1.2.3]
- Possibilité de modifier le nb de participant d'un groupe avec /group nb-participant <nom> <nb>
- Ajout sécurité sur l'exécution de certaint commandes

## [v1.2.2]
- Migration de la BDD Cloud vers la BDD de Rick
- Mise en place du webhook pour récupérer les ajouts/suppressions de succès
- Notification de l'ajout/suppression d'une session dans le channel du groupe associé

## [v1.2.1]
### Added
- Envoi d'un MP lors d'un succès "meta" débloqué (excepté le succès des 1M de points pour le moment)

## [v1.2.0]
- Montée de version de discordjs ! (13 -> 14)
- Nouveaux rôle : 'Écuyer' (- 2 mois d'ancienneté) et 'Chasseur' (+ 2 mois d'ancienneté)
### Fixed
- Limitation sur le nombre de sessions affichées

## [v1.1.2]
### Added
- Création de groupe : nombre maximum de participants facultatif, mais impossible de dépasser ce max s'il est utilisé !

## [v1.1.1a]
### Fixed
- Petite correction mineure qui faisait crash le bot lors de la création d'un groupe

## [v1.1.1]
### Changed
- Suppression de la catégorie archive des discussions de groupe

### Added
- Augmentation du nombre max de groupe créable possible (de 50 à 100)
- Ajout de permissions pour les discodeurs pour voir les channels des discussions de groupe

## [v1.1.0]
- Migration du bot sur un autre serveur

## [v1.0.6]
- Calendrier de l'avent !
- Utilisation de .env pour les config !

## [v1.0.5]
### Changed
- TOUTES les applications (jeux, demo, etc) de Steam sont récupérées
- Lors d'une création de groupe ou de vente d'un jeu, on filtre **seulement** sur les type *'game'* 

### Added
- Slash commands : info

### Fixed
- correction d'une faute de grammaire de Kek dans le changelog :p

### Removed
- Anciennes commandes (avec ancien préfixe) : info, uptime

## [v1.0.4]
- Nouvelle visualisation du profile en forme de carte !
- Et customisable via la commande `/shop custom` ! 
- Méta-achievements, visible sur la carte du profile et en détails via `/profile succes`

## [v1.0.3]
- Un salon textuel est créé lors de la création d'un groupe !
- Une partie des anciennes commandes avec préfixes ont été supprimées

## [v1.0.2]
### Added
- /group kick <user>
- Possibilité d'avoir plusieurs sessions pour un groupe !
    - [CHANGED] renommage de la commande '/group schedule' en '/group session'
    - pour supprimer une date, refaire la même commande que pour ajouter une date : '/group session <groupe> <jour> <heure>'
    - [FIX] format de la date du jour possible entre JJ/MM/AA et JJ/MM/YYYY
- Création automatique de salon vocal, en joignant 'Créer un salon vocal' !
    - Dès qu'il n'y a plus personne sur le salon, celui-ci est détruit

## [v1.0.1]
### Added
- Autocomplétion d'un jeu : 
    - nom exact possible
    - recherche limité à 25
- 150 Points CDS par défaut pour les nouveaux utilisateurs
- 5 Points CDS par message envoyé, limité à 50 Points / jour et 30 secondes entre chaque message

### Changed
- Remboursement auto de l'achat d'un item lors d'une annulation d'une transaction.
- Finir un groupe donne maintenant des Points CDS automatiquement, en fonction du nombre de participant

### Fixed
- Quelques faute de grammaire.. la faute à Tobi :p
- Si quelconque erreur, elle est catchée (normalement) et le bot ne crash pas

## [v1.0.0]
### Added
- Slash Commands
- Shop / Admin shop
- Gestion de groupe
- Gestion XP et Niveau
- Début de récupération de stats

## [v0.1.0]
### Added
- Commands :
    - help (aliases: h)
    - info (aliases: bot, botinfo, about)
    - user (aliases: userinfo)
    - serverinfo (aliases: si)
    - uptime (aliases: up)
    - ping
## Creation of the project on January 17, 2021
