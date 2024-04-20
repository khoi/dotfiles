return {
	{
		"stevearc/conform.nvim",
		config = function()
			require("configs.conform")
		end,
	},

	{
		"nvim-tree/nvim-tree.lua",
		opts = {
			git = { enable = true },
		},
	},

	{
		"github/copilot.vim",
		lazy = false,
	},

	{
		"christoomey/vim-tmux-navigator",
		lazy = false,
		cmd = {
			"TmuxNavigateLeft",
			"TmuxNavigateDown",
			"TmuxNavigateUp",
			"TmuxNavigateRight",
			"TmuxNavigatePrevious",
		},
		init = function()
			-- local nav = require("nvim-tmux-navigator")
			local map = vim.keymap.set
			map("n", "<c-h>", "<cmd>TmuxNavigateLeft<cr>")
			map("n", "<c-j>", "<cmd>TmuxNavigateDown<cr>")
			map("n", "<c-k>", "<cmd>TmuxNavigateUp<cr>")
			map("n", "<c-l>", "<cmd>TmuxNavigateRight<cr>")
			map("n", "<c-\\>", "<cmd>TmuxNavigatePrevious<cr>")
		end,
	},
}
