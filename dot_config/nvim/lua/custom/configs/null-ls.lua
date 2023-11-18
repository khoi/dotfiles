local null_ls = require("null-ls")

local b = null_ls.builtins

local sources = {
	b.formatting.prettierd,
	b.formatting.rustfmt,
	b.formatting.stylua,
	b.formatting.clang_format,
	b.formatting.goimports,
	b.formatting.golines,
	b.diagnostics.eslint_d.with({ -- js/ts linter
		condition = function(utils)
			return utils.root_has_file(".eslintrc.js") or utils.root_has_file(".eslintrc.json")
		end,
	}),
}

local augroup = vim.api.nvim_create_augroup("LspFormatting", {})

null_ls.setup({
	debug = true,
	sources = sources,
	on_attach = function(client, bufnr)
		if client.supports_method("textDocument/formatting") then
			vim.api.nvim_clear_autocmds({ group = augroup, buffer = bufnr })
			vim.api.nvim_create_autocmd("BufWritePre", {
				group = augroup,
				buffer = bufnr,
				callback = function()
					vim.lsp.buf.format({
						filter = function(c)
							--  only use null-ls for formatting instead of lsp server
							return c.name == "null-ls"
						end,
						bufnr = bufnr,
					})
				end,
			})
		end
	end,
})
