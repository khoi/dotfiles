local map = vim.keymap.set

map("n", "<BS>", "<C-^>", { desc = "Switch to previous buffer" })

-- map ; to : in normal mode
map("n", ";", ":", { noremap = true })

-- map <Space><Space> to find git files
map("n", "<Space><Space>", "<cmd>FzfLua git_files<cr>", { desc = "Find git files" })
