local dark_colorscheme = "onedark"
local light_colorscheme = "onelight"

local plugins = {
  { "olimorris/onedarkpro.nvim", opts = {} },
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
}

local rest = {
  {
    "folke/snacks.nvim",
    opts = function(_, opts)
      opts = opts or {}
      opts.picker = opts.picker or {}
      opts.picker.sources = opts.picker.sources or {}
      opts.picker.sources.files = vim.tbl_deep_extend("force", opts.picker.sources.files or {}, {
        hidden = true,
        ignored = true,
      })
      return opts
    end,
  },
  {
    "mrjones2014/smart-splits.nvim",
    lazy = false,
    keys = function()
      return {
        {
          "<C-h>",
          function()
            require("smart-splits").move_cursor_left()
          end,
          desc = "Move to left split",
        },
        {
          "<C-j>",
          function()
            require("smart-splits").move_cursor_down()
          end,
          desc = "Move to split below",
        },
        {
          "<C-k>",
          function()
            require("smart-splits").move_cursor_up()
          end,
          desc = "Move to split above",
        },
        {
          "<C-l>",
          function()
            require("smart-splits").move_cursor_right()
          end,
          desc = "Move to right split",
        },
      }
    end,
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
  -- Configure fzf-lua to show hidden files
  {
    "ibhagwan/fzf-lua",
    opts = {
      files = {
        fd_opts = "--color=never --type f --hidden --follow --exclude .git",
      },
    },
  },
}

vim.list_extend(plugins, rest)

return plugins
