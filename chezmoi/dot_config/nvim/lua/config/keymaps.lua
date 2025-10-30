local map = vim.keymap.set

map("n", "<BS>", "<C-^>", { desc = "Switch to previous buffer" })

-- map ; to : in normal mode
map("n", ";", ":", { noremap = true })
