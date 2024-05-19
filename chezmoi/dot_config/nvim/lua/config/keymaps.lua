local map = vim.keymap.set

map("i", "jj", "<ESC>", { desc = "jj to quit insert mode" })

map("n", "<leader>w", "<cmd>:w<cr>", { desc = "Save with leader space" })

-- map backspace to CTRL-^
map("n", "<BS>", "<C-^>", { desc = "Switch to previous buffer" })

if os.getenv("TMUX") then
  vim.keymap.set("n", "<C-h>", "<cmd>NvimTmuxNavigateLeft<cr>")
  vim.keymap.set("n", "<C-j>", "<cmd>NvimTmuxNavigateDown<cr>")
  vim.keymap.set("n", "<C-k>", "<cmd>NvimTmuxNavigateUp<cr>")
  vim.keymap.set("n", "<C-l>", "<cmd>NvimTmuxNavigateRight<cr>")
end
