#!/bin/sh

VPN_INFO=$(scutil --nc list | grep "^\*" | head -n 1)
VPN_NAME=
if [[ $VPN_INFO != "" ]]; then
  VPN_NAME=$(echo $VPN_INFO | sed -E 's/.*"(.*)".*/\1/')
  if m vpn status "$VPN_NAME" | grep "IsPrimaryInterface : 1"; then
    m vpn stop "$VPN_NAME"
  else
    m vpn start "$VPN_NAME"
  fi
fi
