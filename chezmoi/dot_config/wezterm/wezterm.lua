local wezterm = require("wezterm")
local act = wezterm.action
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

wezterm.on("gui-startup", function()
	-- PERSONAL
	local personal_cmd_tab, dotfiles_pane, dev_window = mux.spawn_window({
		workspace = "khoi",
		cwd = wezterm.home_dir,
	})

	local config_tab, config_pane, _ = dev_window:spawn_tab({
		cwd = wezterm.home_dir .. "/.config",
	})
	config_pane:send_text("nvim\n")

	local chezmoi_tab, _, _ = dev_window:spawn_tab({
		cwd = wezterm.home_dir .. "/.local/share/chezmoi",
	})

	personal_cmd_tab:activate()
	-- WORK
	local work_cmd_tab, app_pane, work_window = mux.spawn_window({
		workspace = "Goodnotes",
		cwd = wezterm.home_dir .. "/Developer/code/github.com/GoodNotes/GoodNotes-5",
	})

	local _, lazygit_pane, _ = work_window:spawn_tab({
		cwd = wezterm.home_dir .. "/Developer/code/github.com/GoodNotes/GoodNotes-5",
	})
	lazygit_pane:send_text("lazygit\n")

	local _, gnllm_pane, _ = work_window:spawn_tab({
		cwd = wezterm.home_dir .. "/Developer/code/github.com/GoodNotes/gnllm",
	})

	work_cmd_tab:activate()
end)

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
config.use_fancy_tab_bar = false
config.window_close_confirmation = "NeverPrompt"
config.window_decorations = "RESIZE"
config.window_background_opacity = 0.75
config.macos_window_background_blur = 10
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
	{ mods = "SUPER|SHIFT", key = "j", action = act.ShowLauncherArgs({ flags = "FUZZY|WORKSPACES" }) },
	{ mods = "SUPER|SHIFT", key = "f", action = act.QuickSelect },
	{ mods = "SUPER", key = "w", action = wezterm.action.CloseCurrentPane({ confirm = true }) },
	{ mods = "SUPER", key = "f", action = act.Search("CurrentSelectionOrEmptyString") },
	{ mods = "SUPER", key = "g", action = act.ActivateCopyMode },
	{ mods = "SUPER", key = "\\", action = act.SplitHorizontal({ domain = "CurrentPaneDomain" }) },
	{ mods = "SUPER|SHIFT", key = "\\", action = act.SplitVertical({ domain = "CurrentPaneDomain" }) },
	{ mods = "SUPER", key = "[", action = act.ActivatePaneDirection("Prev") },
	{ mods = "SUPER", key = "]", action = act.ActivatePaneDirection("Next") },
}

return config
