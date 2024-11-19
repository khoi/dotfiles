local wezterm = require("wezterm")
local config = wezterm.config_builder()

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

config.bold_brightens_ansi_colors = true
config.color_scheme = scheme_for_appearance(get_appearance())
config.enable_tab_bar = true
config.font = wezterm.font("BerkeleyMono Nerd Font Mono")
config.initial_cols = 160

config.show_new_tab_button_in_tab_bar = false
config.show_tab_index_in_tab_bar = false
config.use_fancy_tab_bar = false
config.tab_bar_at_bottom = true
config.tab_max_width = 24
config.window_decorations = "RESIZE"
config.window_frame = {
	font_size = 14.0,
}
config.window_padding = {
	left = 0,
	right = 0,
	top = 0,
	bottom = 0,
}
config.window_close_confirmation = "NeverPrompt"
config.default_cursor_style = "SteadyBlock"

return config
