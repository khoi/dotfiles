set -gx XDG_CONFIG_HOME ~/.config

test -d ~/.bin && fish_add_path --append ~/.bin
test -d ~/.local/bin && fish_add_path --prepend ~/.local/bin
test -d /opt/homebrew/bin && fish_add_path --append /opt/homebrew/bin
test -d /opt/homebrew/sbin && fish_add_path --append /opt/homebrew/sbin
test -d ~/.bun/bin && fish_add_path --append ~/.bun/bin

if test -x ~/.local/bin/mise
    ~/.local/bin/mise activate fish | source
else if command -v mise &>/dev/null
    mise activate fish | source
end
