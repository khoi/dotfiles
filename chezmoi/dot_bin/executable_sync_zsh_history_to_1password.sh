#!/usr/bin/env zsh

set -Eeuo pipefail

history1="/tmp/.zsh_history"
history2="$HOME/.zsh_history"
merged="/tmp/.zsh_merged"

echo "Merging history files: $history1 + $history2 to + $merged"

op document get .zsh_history --force -o $history1

test ! -f $history1 && echo "File $history1 not found" && exit 1
test ! -f $history2 && echo "File $history2 not found" && exit 1

# print out number of lines
echo "1Password: $(wc -l $history1)"
echo "Local    : $(wc -l $history2)"

cat $history1 $history2 | gawk -v date="WILL_NOT_APPEAR$(date +"%s")" '{if (sub(/\\$/,date)) printf "%s", $0; else print $0}' | LC_ALL=C sort -u | gawk -v date="WILL_NOT_APPEAR$(date +"%s")" '{gsub('date',"\\\n"); print $0}' > $merged

echo "Replacing $merged to + $history2"
cp -f $merged $history2

echo "Merged   : $(wc -l $history2)"
op document edit .zsh_history $history2
echo "DONE"
