local map = vim.keymap.set

map("n", "<BS>", "<C-^>", { desc = "Switch to previous buffer" })

-- map ; to : in normal mode
map("n", ";", ":", { noremap = true })

if os.getenv("TMUX") then
  vim.keymap.set("n", "<C-h>", "<cmd>NvimTmuxNavigateLeft<cr>")
  vim.keymap.set("n", "<C-j>", "<cmd>NvimTmuxNavigateDown<cr>")
  vim.keymap.set("n", "<C-k>", "<cmd>NvimTmuxNavigateUp<cr>")
  vim.keymap.set("n", "<C-l>", "<cmd>NvimTmuxNavigateRight<cr>")
end
