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

pkill -9 "Goodnotes"

FILES=(/Applications/Goodnotes.app/
  ~/Library/Containers/com.goodnotesapp.x
)
IFS=""

for f in "${FILES[@]}"; do
  sudo rm -rf "$f"
done

echo "✅ Done"