#!/usr/bin/env bash

BTC=$(curl -s https://api.binance.com/api/v1/ticker/price\?symbol\=BTCUSDT | jq -r .price | cut -d "." -f1)

sketchybar --set $NAME icon="􁑞" label="${BTC}"