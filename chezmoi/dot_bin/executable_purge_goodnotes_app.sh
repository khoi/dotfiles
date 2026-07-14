#!/usr/bin/env bash

set -Eeuo pipefail

cat <<'EOF'
    :+*#%%%@@@@@@@@@@@@@@@@@@%%%#*+:    
  =#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@#=  
 *%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%* 
+%@@@@@@@@@@@@@@@@@@@@@@@@@@@@%##@@@@@%+
%%@@@@@@@@@@@@@@@@@@@@@@@@@@@=   :%@@@%%
%@@@@@@@%****************@@@*    .@@@@@%
@@@@@@@@@%%%%%%%%%%%%%%%%@@%     #@@@@@%
@@@@@@@@@@@@@@@@@@@@@@@@@@@:    +@@@@@@%
@@@@@@@@@@@@@@@@@@@@@@@@@@=    :@@@@@@@%
@@@@@@@@%*************%@@#     %@@@@@@@%
@@@@@@@@@@@@@@@@@@@@@@@@@.    *@@@@@@@@%
@@@@@@@@@@@@%@@@@@@@@@@@#    +@@@@@@@@@%
@@@@@@@@@@#*+#@@@@@@@@@@%  :#@@@@@@@@@@%
@@@@@@@@%**#**@@@@@@@@@@@=*@@@@@@@@@@@@%
%@@@@@@@@@@@%**%@@@@@@%#%@@@@@@@@@@@@@@%
%%@@@@@@@@@@@@#***##***#%@@@@@@@@@@@@@%%
+%@@@@@@@@@@@@@@@%%%%@@@@@@@@@@@@@@@@@%+
 *%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%* 
  =#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@#-  
    :=*#%%%%%%%%%%%%%%%%%%%%%%%%#*=:    
EOF

echo "🔥 Deleting Goodnotes and its data..."
echo "🔒 Enter your password to continue (we need this to remove file under /Applications)"

sudo -v

pkill -9 "Goodnotes" || true

FILES=(/Applications/Goodnotes.app
  ~/Library/Containers/com.goodnotesapp.x
  ~/Library/Containers/com.goodnotesapp.x.WidgetExtension
  ~/Library/Group\ Containers/group.com.goodnotesapp.goodnotes
  ~/Library/Group\ Containers/group.com.goodnotesapp.nexushelper
  ~/Library/Group\ Containers/group.com.goodnotesapp.open-in-action-extension
)
IFS=""

echo "🗑️ Removing files..."

for f in "${FILES[@]}"; do
  echo "  Removing $f"
  sudo rm -rf "$f"
done

echo "🗑️ Removing UserDefaults com.goodnotesapp.x"
defaults delete com.goodnotesapp.x 2>/dev/null || true

echo "✅ Done"
