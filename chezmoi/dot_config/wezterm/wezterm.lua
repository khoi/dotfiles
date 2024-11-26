local wezterm = require("wezterm")
local act = wezterm.action
local config = wezterm.config_builder()
local mux = wezterm.mux
local bar = wezterm.plugin.require("https://github.com/khoi/bar.wezterm")

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
config.color_scheme = "Gruvbox dark, hard (base16)"
bar.apply_to_config(config, {
	modules = {
		spotify = {
			enabled = false,
		},
		pane = {
			enabled = false,
		},
	},
})
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
config.window_background_opacity = 1
config.macos_window_background_blur = 10
config.window_frame = {
	font_size = 14.0,
}
config.inactive_pane_hsb = { brightness = 0.8, saturation = 0.9 }
config.window_padding = {
	left = "1cell",
	right = "1cell",
	top = 0,
	bottom = 0,
}

config.leader = { key = "s", mods = "CTRL", timeout_milliseconds = 1000 }
config.keys = {
	{ mods = "LEADER", key = "\\", action = act.SplitHorizontal({ domain = "CurrentPaneDomain" }) },
	{ mods = "LEADER", key = "-", action = act.SplitVertical({ domain = "CurrentPaneDomain" }) },
	{ mods = "LEADER", key = "h", action = act.AdjustPaneSize({ "Left", 5 }) },
	{ mods = "LEADER", key = "l", action = act.AdjustPaneSize({ "Right", 5 }) },
	{ mods = "LEADER", key = "j", action = act.AdjustPaneSize({ "Down", 5 }) },
	{ mods = "LEADER", key = "k", action = act.AdjustPaneSize({ "Up", 5 }) },
	{ mods = "CTRL", key = "h", action = act.ActivatePaneDirection("Left") },
	{ mods = "CTRL", key = "j", action = act.ActivatePaneDirection("Down") },
	{ mods = "CTRL", key = "k", action = act.ActivatePaneDirection("Up") },
	{ mods = "CTRL", key = "l", action = act.ActivatePaneDirection("Right") },
	{ mods = "CTRL", key = "[", action = act.ActivateTabRelative(-1) },
	{ mods = "CTRL", key = "]", action = act.ActivateTabRelative(1) },

	{ mods = "SUPER", key = "[", action = act.SwitchWorkspaceRelative(-1) },
	{ mods = "SUPER", key = "]", action = act.SwitchWorkspaceRelative(1) },
	{ mods = "SUPER", key = "f", action = act.Search("CurrentSelectionOrEmptyString") },
	{ mods = "SUPER|SHIFT", key = "j", action = act.ShowLauncherArgs({ flags = "FUZZY|WORKSPACES" }) },
	{ mods = "SUPER", key = "g", action = act.ActivateCopyMode },
	{ mods = "SUPER", key = "p", action = act.ShowLauncher },
	{ mods = "SUPER", key = "w", action = wezterm.action.CloseCurrentPane({ confirm = true }) },
	{ mods = "SUPER|SHIFT", key = "f", action = act.QuickSelect },
	{ mods = "SUPER|SHIFT", key = "j", action = act.ShowLauncherArgs({ flags = "FUZZY|WORKSPACES" }) },
}

--- @generic T
--- @param dst T[]
--- @param ... T[]
--- @return T[]
local function list_extend(dst, ...)
	for _, list in ipairs({ ... }) do
		for _, v in ipairs(list) do
			table.insert(dst, v)
		end
	end
	return dst
end

local key_tables = wezterm.gui.default_key_tables()

local accept_pattern = {
	Multiple = {
		{ CopyMode = "ClearSelectionMode" },
		{ CopyMode = "AcceptPattern" },
	},
}

list_extend(key_tables.copy_mode, {
	{ key = "/", action = { Search = { CaseInSensitiveString = "" } } },
	{ key = "n", action = { CopyMode = "NextMatch" } },
	{ key = "n", mods = "SHIFT", action = { CopyMode = "PriorMatch" } },
	{
		key = "y",
		action = {
			Multiple = {
				{ CopyTo = "PrimarySelection" },
				{ CopyMode = "Close" },
			},
		},
	},
	{
		key = "[",
		mods = "NONE",
		action = act.CopyMode("MoveBackwardSemanticZone"),
	},
	{
		key = "]",
		mods = "NONE",
		action = act.CopyMode("MoveForwardSemanticZone"),
	},
})

list_extend(key_tables.search_mode, {
	{ key = "Enter", action = accept_pattern },
})
config.key_tables = key_tables
return config
