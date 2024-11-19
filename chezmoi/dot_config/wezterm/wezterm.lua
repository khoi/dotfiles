local wezterm = require("wezterm")
local act = wezterm.action
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
config.default_cursor_style = "SteadyBlock"
config.enable_tab_bar = true
config.font = wezterm.font("BerkeleyMono Nerd Font Mono")
config.initial_cols = 160
config.show_new_tab_button_in_tab_bar = false
config.show_tab_index_in_tab_bar = false
config.skip_close_confirmation_for_processes_named = {
	"bash",
	"sh",
	"zsh",
	"fish",
	"tmux",
	"nu",
	"cmd.exe",
	"pwsh.exe",
	"powershell.exe",
}
config.tab_bar_at_bottom = true
config.tab_max_width = 24
config.use_fancy_tab_bar = false
config.window_close_confirmation = "NeverPrompt"
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
config.keys = {
	-- See https://github.com/shantanuraj/dotfiles/blob/main/.wezterm.lua for inspiration
	{
		key = "f",
		mods = "SUPER|SHIFT",
		action = act.QuickSelect,
	},
	{
		key = "f",
		mods = "SUPER",
		action = act.Search("CurrentSelectionOrEmptyString"),
	},
	{
		key = "g",
		mods = "SUPER",
		action = act.ActivateCopyMode,
	},
	{ mods = "SUPER", key = "\\", action = act.SplitHorizontal({ domain = "CurrentPaneDomain" }) },
	{ mods = "SUPER|SHIFT", key = "\\", action = act.SplitVertical({ domain = "CurrentPaneDomain" }) },
	{ mods = "SUPER", key = "[", action = act.ActivatePaneDirection("Prev") },
	{ mods = "SUPER", key = "]", action = act.ActivatePaneDirection("Next") },
}

return config
