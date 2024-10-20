local wezterm = require("wezterm")
local config = wezterm.config_builder()
local mux = wezterm.mux

local function get_appearance()
	if wezterm.gui then
		return wezterm.gui.get_appearance()
	end
	return "Dark"
end

local function scheme_for_appearance(appearance)
	if appearance:find("Dark") then
		return "GruvboxDark"
	else
		return "GruvboxLight"
	end
end

config.font = wezterm.font("JetbrainsMono Nerd Font")
config.enable_tab_bar = false
config.window_decorations = "RESIZE"
config.color_scheme = scheme_for_appearance(get_appearance())
config.window_padding = {
	left = 0,
	right = 0,
	top = 0,
	bottom = 0,
}
config.window_close_confirmation = "NeverPrompt"

return config
