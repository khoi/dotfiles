return {
  {
    "catppuccin/nvim",
    name = "catppuccin",
    lazy = false,
    priority = 1000,
    config = function()
      require("catppuccin").setup({
        flavour = "macchiato", -- latte, frappe, macchiato, mocha
        transparent_background = true, -- enable transparent background
        float = {
          transparent = true, -- enable transparent floating windows
          solid = false, -- use solid styling for floating windows, see |winborder|
        },
      })
    end,
  },
  {
    "f-person/auto-dark-mode.nvim",
    opts = {
      update_interval = 1000,
      set_dark_mode = function()
        vim.api.nvim_set_option_value("background", "dark", {})
        vim.cmd.colorscheme("catppuccin-macchiato")
      end,
      set_light_mode = function()
        vim.api.nvim_set_option_value("background", "light", {})
        vim.cmd.colorscheme("catppuccin-macchiato")
      end,
    },
  },
  {
    "LazyVim/LazyVim",
    opts = {
      colorscheme = "catppuccin-macchiato",
    },
  },
  {
    "mrjones2014/smart-splits.nvim",
    lazy = false,
    keys = function()
      return {
        {
          "<A-h>",
          function()
            require("smart-splits").move_cursor_left()
          end,
          desc = "Move to left split",
        },
        {
          "<A-j>",
          function()
            require("smart-splits").move_cursor_down()
          end,
          desc = "Move to split below",
        },
        {
          "<A-k>",
          function()
            require("smart-splits").move_cursor_up()
          end,
          desc = "Move to split above",
        },
        {
          "<A-l>",
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
            { "filetype", icon_only = true, separator = "", padding = { left = 1, right = 0 } },
            { LazyVim.lualine.pretty_path() },
          },
          lualine_x = {
            "venv-selector",
          },
          lualine_y = {
            { "location", padding = { left = 1, right = 1 } },
          },
          lualine_z = {},
        },
        extensions = { "toggleterm", "neo-tree", "lazy", "quickfix" },
      }
    end,
  },

  -- Undo tree
  {
    "stevearc/oil.nvim",
    lazy = false,
    dependencies = { "nvim-tree/nvim-web-devicons" },
    keys = {
      { "<leader>e", "<cmd>Oil<CR>", desc = "File Explorer" },
    },
    opts = {
      default_file_explorer = true,
      skip_confirm_for_simple_edits = true,
      prompt_save_on_select_new_entry = false,
      view_options = {
        show_hidden = true,
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
  -- Configure blink.cmp for Ctrl+j/k navigation
  {
    "saghen/blink.cmp",
    opts = {
      keymap = {
        preset = "default",
        ["<C-j>"] = { "select_next", "fallback" },
        ["<C-k>"] = { "select_prev", "fallback" },
      },
    },
  },
}
