# CDS-BOT

Bot Discord officiel du serveur "Chasseurs de Succès" (CDS).

## Installation

Ce bot a besoin de `node` et `mongodb`.

Pour le configurer, modifiez le fichier `example.env` tout en le renommant
`.env`. Vous pouvez ensuite l'exécuter en tapant ces commandes :

```
npm install
source .env
node run index.js
```

### Avec Docker

Vous pouvez utiliser l'image Docker pour pouvoir déployer le bot sur votre
machine. Vous pouvez le configurer en modifiant `exemple.env` tout en le
renommant `.env`. **Ne modifiez pas la valeur de `DBCONNECTION`.** La valeur
d'exemple redirige vers la base de données se trouvant dans le fichier
`docker-compose.yml`.

Il suffit de taper `docker compose up` pour pouvoir lancer le bot. Si vous ne
souhaitez pas construire l'image vous-même, vous pouvez utiliser celle se
trouvant dans [les paquets](https://github.com/TobiBiotex/CDS-BOT/packages) du
dépôt Github.

## Migration BDD

Vous devez avoir un dump de base de données puis taper ces commandes. N'oubliez
pas de changer le nom `cds_dump` avec le nom de votre fichier et
`cds-bot-mongodb-1` par le nom de votre conteneur.

```
docker compose up -d
docker cp cds_dump cds-bot-mongodb-1:/tmp
docker exec -t cds-bot-mongodb-1 mongorestore --drop --archive=/tmp/cds_dump
docker exec -t cds-bot-mongodb-1 rm /tmp/cds_dump
```
