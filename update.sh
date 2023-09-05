#!/usr/bin/env bash

pushd $HOME/CDS-BOT
docker compose pull
docker compose up -d
popd
