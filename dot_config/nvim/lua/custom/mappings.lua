---@type MappingsTable
local M = {}

M.disabled = {
	-- Disable navigation in favor of vim-tmux-navigator
	n = {
		["<C-h>"] = "",
		["<C-l>"] = "",
		["<C-j>"] = "",
		["<C-k>"] = "",
	},
	v = {
		["<C-h>"] = "",
		["<C-l>"] = "",
		["<C-j>"] = "",
		["<C-k>"] = "",
	},
}

M.general = {
	n = {
		[";"] = { ":", "enter command mode", opts = { nowait = true } },
		["gho"] = {
			"<cmd> OpenInGHFileLines <CR>",
			"Open lines in GitHub",
		},
	},
	v = {
		[">"] = { ">gv", "indent" },
		["gho"] = {
			"<cmd>'<,'> OpenInGHFileLines <CR>",
			"Open lines in GitHub",
		},
	},
}

M.telescope = {
	n = {
		["<leader><space>"] = {
			"<cmd> Telescope find_files follow=true no_ignore=false hidden=true <CR>",
			"Find project files",
		},
	},
}

M.copilot = {
	i = {
		["<C-l>"] = {
			function()
				vim.fn.feedkeys(vim.fn["copilot#Accept"](), "")
			end,
			"Copilot Accept",
			{ replace_keycodes = true, nowait = true, silent = true, expr = true, noremap = true },
		},
	},
}

M.lspconfig = {
	n = {
		["<leader>q"] = {
			function()
				vim.print("Use <leader>d")
			end,
			"Diagnostic setloclist",
		},

		["<leader>dd"] = {
			function()
				require("trouble").open()
			end,
			"Diagnostic",
		},

		["<leader>dw"] = {
			function()
				require("trouble").open("workspace_diagnostics")
			end,
			"Workspace Diagnostic",
		},

		["<leader>dc"] = {
			function()
				require("trouble").open("document_diagnostics")
			end,
			"Document Diagnostic",
		},

		["<leader>df"] = {
			function()
				require("trouble").open("quickfix")
			end,
			"Quickfix",
		},

		["<leader>dl"] = {
			function()
				require("trouble").open("loclist")
			end,
			"Loclist",
		},

		["gR"] = {
			function()
				require("trouble").open("lsp_references")
			end,
			"LSP References",
		},
	},
}

return M
