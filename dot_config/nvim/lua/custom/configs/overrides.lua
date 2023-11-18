local M = {}

M.treesitter = {
	ensure_installed = {
		"c",
		"css",
		"go",
		"gomod",
		"html",
		"javascript",
		"json",
		"json5",
		"jsonc",
		"lua",
		"markdown",
		"markdown_inline",
		"python",
		"rust",
		"swift",
		"tsx",
		"typescript",
		"vim",
	},
	indent = {
		enable = true,
		-- disable = {
		--   "python"
		-- },
	},
}

M.mason = {
	ensure_installed = {
		-- lua stuff
		"lua-language-server",
		"stylua",

		-- web dev stuff
		"css-lsp",
		"html-lsp",
		"typescript-language-server",
		"prettierd",
		"eslint_d", -- ts/js linter
		"tailwindcss-language-server",

		-- c/cpp stuff
		"clangd",
		"clang-format",

		-- golang
		"goimports", -- go formatter
		"golines", -- go formatter
	},
	automatic_installation = true,
}

M.telescope = {
	pickers = {
		live_grep = {
			additional_args = function()
				return { "--hidden", "--glob", "!**/.git/*" }
			end,
		},
	},
}

-- git support in nvimtree
M.nvimtree = {
	git = {
		enable = false,
	},

	renderer = {
		highlight_git = true,
		icons = {
			show = {
				git = true,
			},
		},
	},
}

M.nvterm = {
	terminals = {
		type_opts = {
			float = {
				relative = "editor",
				row = 0.2,
				col = 0.1,
				width = 0.8,
				height = 0.6,
				border = "single",
			},
		},
	},
}

return M
