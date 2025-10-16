return {
  {
    "rebelot/kanagawa.nvim",
    lazy = false,
    priority = 1000,
    config = function()
      require("kanagawa").setup({
        compile = false,
        undercurl = true,
        commentStyle = { italic = true },
        functionStyle = {},
        keywordStyle = { italic = true },
        statementStyle = { bold = true },
        typeStyle = {},
        transparent = true, -- Enable transparent background
        dimInactive = false,
        terminalColors = true,
        colors = {
          palette = {},
          theme = { wave = {}, lotus = {}, dragon = {}, all = {} },
        },
        overrides = function(colors)
          return {}
        end,
        theme = "wave", -- Load "wave" theme when 'background' is dark, "lotus" when light
        background = {
          dark = "wave",
          light = "lotus",
        },
      })
      -- Always use the wave (dark) variant
      vim.cmd.colorscheme("kanagawa-wave")
    end,
  },
  {
    "f-person/auto-dark-mode.nvim",
    opts = {
      update_interval = 1000,
      set_dark_mode = function()
        vim.api.nvim_set_option_value("background", "dark", {})
        vim.cmd.colorscheme("kanagawa-wave") -- Always use dark wave variant
      end,
      set_light_mode = function()
        vim.api.nvim_set_option_value("background", "dark", {}) -- Always dark
        vim.cmd.colorscheme("kanagawa-wave") -- Always use dark wave variant
      end,
    },
  },
  {
    "LazyVim/LazyVim",
    opts = {
      colorscheme = "kanagawa-wave", -- Always use dark wave variant
    },
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
  -- lualine
  {
    "nvim-lualine/lualine.nvim",
    opts = function()
      local function show_macro_recording()
        local recording_register = vim.fn.reg_recording()
        if recording_register == "" then
          return ""
        else
          return "Recording @" .. recording_register
        end
      end
      -- PERF: we don't need this lualine require madness 🤷
      local lualine_require = require("lualine_require")
      lualine_require.require = require

      local icons = require("lazyvim.config").icons

      vim.o.laststatus = vim.g.lualine_laststatus

      return {
        options = {
          theme = "auto",
          globalstatus = true,
          disabled_filetypes = { statusline = { "dashboard", "alpha", "starter" } },
        },
        sections = {
          lualine_a = {
            "mode",
            { "macro-recording", fmt = show_macro_recording },
          },
          lualine_b = { "branch" },

          lualine_c = {
            LazyVim.lualine.root_dir(),
            {
              "diagnostics",
              symbols = {
                error = icons.diagnostics.Error,
                warn = icons.diagnostics.Warn,
                info = icons.diagnostics.Info,
                hint = icons.diagnostics.Hint,
              },
            },
            { LazyVim.lualine.pretty_path() },
          },
          lualine_x = {
            "venv-selector",
          },
          lualine_y = {
            { "filetype", padding = { left = 1, right = 1 } },
            { "location", padding = { left = 1, right = 1 } },
          },
          lualine_z = {},
        },
        extensions = { "toggleterm", "neo-tree", "lazy", "quickfix" },
      }
    end,
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
