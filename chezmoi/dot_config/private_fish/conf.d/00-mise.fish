set -gx XDG_CONFIG_HOME "$HOME/.config"

test -d "$HOME/.bin" && fish_add_path --append "$HOME/.bin"
test -d "$HOME/.local/bin" && fish_add_path --prepend "$HOME/.local/bin"
test -d /opt/homebrew/bin && fish_add_path --append /opt/homebrew/bin
test -d /opt/homebrew/sbin && fish_add_path --append /opt/homebrew/sbin

if test -x "$HOME/.local/bin/mise"
    "$HOME/.local/bin/mise" activate fish | source
else if command -q mise
    mise activate fish | source
end
