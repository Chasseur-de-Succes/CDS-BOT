# Changelog

## [Unreleased]

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