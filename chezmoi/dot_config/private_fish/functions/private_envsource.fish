function envsource
    set -f envfile "$argv"
    if not test -f "$envfile"
        echo "Unable to load $envfile"
        return 1
    end
    while read line
        if not string match -qr '^#|^$' "$line"
            if string match -qr '=' "$line"
                set item (string split -m 1 '=' $line)
                set item[2] (eval echo $item[2])
                set -gx $item[1] $item[2]
                echo "Exported key: $item[1]"
            else
                eval $line
            end
        end
    end < "$envfile"
end
