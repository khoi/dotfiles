local wezterm = require("wezterm")
local act = wezterm.action
local config = wezterm.config_builder()
local mux = wezterm.mux
local bar = wezterm.plugin.require("https://github.com/khoi/bar.wezterm")

local function get_appearance()
	if wezterm.gui then
		return wezterm.gui.get_appearance()
	end
	return "Dark"
end

local function scheme_for_appearance(appearance)
	if appearance:find("Dark") then
		return "zenbones_dark"
	else
		return "zenbones"
	end
end

local function is_inside_vim(pane)
	local tty = pane:get_tty_name()
	if tty == nil then
		return false
	end

	local success, _, _ = wezterm.run_child_process({
		"sh",
		"-c",
		"ps -o state= -o comm= -t"
			.. wezterm.shell_quote_arg(tty)
			.. " | "
			.. "grep -iqE '^[^TXZ ]+ +(\\S+\\/)?g?(view|l?n?vim?x?)(diff)?$'",
	})

	return success
end

local function is_outside_vim(pane)
	return not is_inside_vim(pane)
end

local function bind_if(cond, key, mods, action)
	local function callback(win, pane)
		if cond(pane) then
			win:perform_action(action, pane)
		else
			win:perform_action(act.SendKey({ key = key, mods = mods }), pane)
		end
	end

	return { key = key, mods = mods, action = wezterm.action_callback(callback) }
end

wezterm.on("gui-startup", function()
	-- side project
	local _, _, side_project_window = mux.spawn_window({
		workspace = "chat",
		cwd = wezterm.home_dir .. "/Developer/code/github.com/khoi/chat",
	})

	local _, pane, _ = side_project_window:spawn_tab({
		cwd = wezterm.home_dir .. "/Developer/code/github.com/khoi/chat",
	})

	pane:send_text("aider --watch-files\n")

	-- WORK
	local _, _, work_window = mux.spawn_window({
		workspace = "Goodnotes",
		cwd = wezterm.home_dir .. "/Developer/code/github.com/GoodNotes/GoodNotes-5",
	})

	local _, _, _ = work_window:spawn_tab({
		cwd = wezterm.home_dir .. "/Developer/code/github.com/GoodNotes/gnllm",
	})

	-- PERSONAL
	local _, _, dev_window = mux.spawn_window({
		workspace = "khoi",
		cwd = wezterm.home_dir,
	})

	local _, config_pane, _ = dev_window:spawn_tab({
		cwd = wezterm.home_dir .. "/.config",
	})
	config_pane:send_text("nvim\n")

	local _, _, _ = dev_window:spawn_tab({
		cwd = wezterm.home_dir .. "/.local/share/chezmoi",
	})
end)

wezterm.on("trigger-vim-with-scrollback", function(window, pane)
	-- Retrieve the text from the pane
	local text = pane:get_lines_as_text(pane:get_dimensions().scrollback_rows)

	-- Create a temporary file to pass to vim
	local name = os.tmpname()
	local f = io.open(name, "w+")

	if f == nil then
		return
	end

	f:write(text)
	f:flush()
	f:close()

	-- Open a new window running vim and tell it to open the file
	window:perform_action(
		act.SplitHorizontal({
			args = {
				os.getenv("SHELL"),
				"-c",
				"nvim " .. wezterm.shell_quote_arg(name),
			},
		}),
		pane
	)

	-- Wait "enough" time for vim to read the file before we remove it.
	-- The window creation and process spawn are asynchronous wrt. running
	-- this script and are not awaitable, so we just pick a number.
	--
	-- Note: We don't strictly need to remove this file, but it is nice
	-- to avoid cluttering up the temporary directory.
	wezterm.sleep_ms(1000)
	os.remove(name)
end)

config.bold_brightens_ansi_colors = true
config.color_scheme = scheme_for_appearance(get_appearance())
bar.apply_to_config(config, {
	separator = {
		space = 1,
		left_icon = wezterm.nerdfonts.fa_long_arrow_right,
		right_icon = wezterm.nerdfonts.fa_long_arrow_left,
		field_icon = wezterm.nerdfonts.indent_line,
	},
	modules = {
		spotify = {
			enabled = false,
		},
		pane = {
			enabled = false,
		},
		workspace = {
			enabled = true,
			icon = wezterm.nerdfonts.md_fire,
			color = 8,
		},
		tabs = {
			active_tab_fg = 7,
			inactive_tab_fg = 8,
		},
	},
})
config.default_cursor_style = "SteadyBlock"
config.enable_tab_bar = true
config.font = wezterm.font("TX-02")
config.font_size = 16
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
-- config.harfbuzz_features = { "calt=0", "clig=0", "liga=0" }
config.status_update_interval = 1000
config.tab_bar_at_bottom = true
config.use_fancy_tab_bar = false
config.window_close_confirmation = "NeverPrompt"
config.window_decorations = "RESIZE"
config.window_background_opacity = 1
config.macos_window_background_blur = 10
config.window_frame = {
	font_size = 16.0,
}
config.inactive_pane_hsb = { brightness = 0.8, saturation = 0.9 }
config.window_padding = {
	left = "1cell",
	right = "1cell",
	top = 0,
	bottom = 0,
}

config.leader = { key = "q", mods = "CTRL", timeout_milliseconds = 1001 }
config.keys = {
	{ mods = "LEADER", key = "\\", action = act.SplitHorizontal({ domain = "CurrentPaneDomain" }) },
	{ mods = "LEADER", key = "-", action = act.SplitVertical({ domain = "CurrentPaneDomain" }) },
	{ mods = "LEADER", key = "h", action = act.AdjustPaneSize({ "Left", 5 }) },
	{ mods = "LEADER", key = "l", action = act.AdjustPaneSize({ "Right", 5 }) },
	{ mods = "LEADER", key = "j", action = act.AdjustPaneSize({ "Down", 5 }) },
	{ mods = "LEADER", key = "k", action = act.AdjustPaneSize({ "Up", 5 }) },
	{ mods = "LEADER", key = "[", action = act.ActivateCopyMode },
	{
		mods = "LEADER | SHIFT",
		key = "!",
		action = wezterm.action_callback(function(win, pane)
			local tab, window = pane:move_to_new_tab()
		end),
	},
	{
		mods = "LEADER",
		key = "e",
		action = act.EmitEvent("trigger-vim-with-scrollback"),
	},
	bind_if(is_outside_vim, "h", "CTRL", act.ActivatePaneDirection("Left")),
	bind_if(is_outside_vim, "j", "CTRL", act.ActivatePaneDirection("Down")),
	bind_if(is_outside_vim, "k", "CTRL", act.ActivatePaneDirection("Up")),
	bind_if(is_outside_vim, "l", "CTRL", act.ActivatePaneDirection("Right")),
	{ mods = "CTRL", key = "[", action = act.ActivateTabRelative(-1) },
	{ mods = "CTRL", key = "]", action = act.ActivateTabRelative(1) },

	{ mods = "SUPER", key = "[", action = act.SwitchWorkspaceRelative(-1) },
	{ mods = "SUPER", key = "]", action = act.SwitchWorkspaceRelative(1) },
	{
		mods = "SUPER",
		key = "f",
		action = wezterm.action_callback(function(window, pane)
			window:perform_action(act.Search("CurrentSelectionOrEmptyString"), pane)
			window:perform_action(
				act.Multiple({
					act.CopyMode("ClearPattern"),
					act.CopyMode("ClearSelectionMode"),
					act.CopyMode("MoveToScrollbackBottom"),
				}),
				pane
			)
		end),
	},
	{ mods = "SUPER|SHIFT", key = "j", action = act.ShowLauncherArgs({ flags = "FUZZY|WORKSPACES" }) },
	{ mods = "SUPER", key = "p", action = act.ShowLauncher },
	{ mods = "SUPER", key = "w", action = wezterm.action.CloseCurrentPane({ confirm = false }) },
	{ mods = "SUPER|SHIFT", key = "f", action = act.QuickSelect },
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
