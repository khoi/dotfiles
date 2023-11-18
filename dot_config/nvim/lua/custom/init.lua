local autocmd = vim.api.nvim_create_autocmd

-- Auto resize panes when resizing nvim window
autocmd("VimResized", {
	pattern = "*",
	command = "tabdo wincmd =",
})

-- styles
vim.o.termguicolors = true
vim.o.syntax = "on"
vim.o.errorbells = false
vim.o.smartcase = true
vim.o.showmode = false
vim.o.number = true
vim.o.relativenumber = true
vim.o.cmdheight = 0

-- encoding
vim.o.encoding = "utf-8"
vim.o.fileencoding = "utf-8"

-- cursor
vim.o.cursorline = true -- highlight current line
vim.o.cursorlineopt = "number" -- highlight current line number only
vim.o.scrolloff = 10 -- keep at least 8 lines after the cursor when scrolling
vim.o.sidescrolloff = 10 -- (same as `scrolloff` about columns during side scrolling)
vim.o.virtualedit = "block" -- allow the cursor to go in to virtual places

-- disable swap
vim.o.swapfile = false
