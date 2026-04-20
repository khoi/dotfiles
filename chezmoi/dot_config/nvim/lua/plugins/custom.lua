local dark_colorscheme = "zenbones"
local light_colorscheme = "zenbones"

local function set_highlights(groups)
  for group, spec in pairs(groups) do
    vim.api.nvim_set_hl(0, group, spec)
  end
end

local function apply_zenbones_syntax_colors()
  if vim.g.colors_name ~= "zenbones" then
    return
  end

  local palette = require("zenbones.palette")[vim.o.background]

  set_highlights({
    Keyword = { fg = palette.blossom.hex, bold = true },
    Statement = { link = "Keyword" },
    Conditional = { link = "Keyword" },
    Repeat = { link = "Keyword" },
    Exception = { link = "Keyword" },
    PreProc = { link = "Keyword" },
    Function = { fg = palette.sky.hex },
    Type = { fg = palette.water.hex },
    Constant = { fg = palette.wood.hex, italic = true },
    Number = { fg = palette.wood.hex },
    Boolean = { fg = palette.wood.hex, italic = true },
    String = { fg = palette.leaf.hex, italic = true },
    Special = { fg = palette.rose.hex, bold = true },
    ["@keyword"] = { link = "Keyword" },
    ["@keyword.function"] = { link = "Keyword" },
    ["@keyword.return"] = { link = "Keyword" },
    ["@conditional"] = { link = "Conditional" },
    ["@repeat"] = { link = "Repeat" },
    ["@function"] = { link = "Function" },
    ["@function.call"] = { link = "Function" },
    ["@function.builtin"] = { link = "Function" },
    ["@method"] = { link = "Function" },
    ["@method.call"] = { link = "Function" },
    ["@constructor"] = { link = "Type" },
    ["@type"] = { link = "Type" },
    ["@type.builtin"] = { link = "Type" },
    ["@constant"] = { link = "Constant" },
    ["@constant.builtin"] = { link = "Constant" },
    ["@number"] = { link = "Number" },
    ["@boolean"] = { link = "Boolean" },
    ["@string"] = { link = "String" },
    ["@string.escape"] = { link = "Special" },
    ["@string.special"] = { link = "Special" },
    ["@punctuation.special"] = { link = "Special" },
  })
end

local function setup_zenbones_highlights()
  local group = vim.api.nvim_create_augroup("khoi_zenbones_highlights", { clear = true })

  vim.api.nvim_create_autocmd("ColorScheme", {
    group = group,
    pattern = "zenbones",
    callback = apply_zenbones_syntax_colors,
  })

  apply_zenbones_syntax_colors()
end

return {
  {
    "zenbones-theme/zenbones.nvim",
    dependencies = { "rktjmp/lush.nvim" },
    lazy = false,
    priority = 1000,
    config = setup_zenbones_highlights,
  },
  { "LazyVim/LazyVim", opts = { colorscheme = dark_colorscheme } },
  {
    "f-person/auto-dark-mode.nvim",
    opts = function()
      local function apply(background)
        local colorscheme = background == "light" and light_colorscheme or dark_colorscheme
        vim.api.nvim_set_option_value("background", background, {})
        vim.cmd.colorscheme(colorscheme)
      end
      return {
        update_interval = 1000,
        set_dark_mode = function()
          apply("dark")
        end,
        set_light_mode = function()
          apply("light")
        end,
      }
    end,
  },
  {
    "folke/snacks.nvim",
    opts = {
      picker = {
        sources = {
          files = { hidden = true },
        },
      },
    },
  },
  -- add more treesitter parsers
  {
    "nvim-treesitter/nvim-treesitter",
    opts = function(_, opts)
      -- add tsx and treesitter
      vim.list_extend(opts.ensure_installed, {
        "tsx",
        "typescript",
      })
    end,
  },
  {
    "folke/noice.nvim",
    event = "VeryLazy",
    opts = {
      presets = {
        bottom_search = true,
        command_palette = false,
        long_message_to_split = true,
        inc_rename = true,
      },
    },
  },
  {
    "mfussenegger/nvim-lint",
    opts = {
      linters_by_ft = {
        markdown = {},
      },
    },
  },
  {
    "saghen/blink.cmp",
    opts = {
      keymap = {
        ["<C-j>"] = { "select_next", "fallback" },
        ["<C-k>"] = { "select_prev", "fallback" },
        ["<S-Tab>"] = { "select_prev", "fallback" },
        ["<Tab>"] = { "select_next", "fallback" },
      },
      completion = {
        list = {
          selection = {
            preselect = false,
            auto_insert = true,
          },
        },
      },
    },
  },
}
