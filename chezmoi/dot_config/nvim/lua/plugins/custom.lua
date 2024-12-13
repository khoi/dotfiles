return {
  -- Gruvbox
  {
    "sainnhe/gruvbox-material",
    config = function()
      vim.g.gruvbox_material_background = "hard"
      vim.g.gruvbox_material_foreground = "material"
      vim.cmd.colorscheme("gruvbox-material")
    end,
  },
  -- {
  --   "f-person/auto-dark-mode.nvim",
  --   opts = {
  --     update_interval = 1000,
  --     set_dark_mode = function()
  --       vim.api.nvim_set_option_value("background", "dark", {})
  --     end,
  --     set_light_mode = function()
  --       vim.api.nvim_set_option_value("background", "light", {})
  --     end,
  --   },
  -- },
  {
    "LazyVim/LazyVim",
    opts = {
      colorscheme = "gruvbox-material",
    },
  },
  {
    "numToStr/Navigator.nvim",
    lazy = true,
    event = "VeryLazy",
    keys = {
      { "<C-h>", "<cmd>NavigatorLeft<cr>", { silent = true, desc = "navigate left" } },
      { "<C-j>", "<cmd>NavigatorDown<cr>", { silent = true, desc = "navigate down" } },
      { "<C-k>", "<cmd>NavigatorUp<cr>", { silent = true, desc = "navigate up" } },
      { "<C-l>", "<cmd>NavigatorRight<cr>", { silent = true, desc = "navigate right" } },
    },
    config = function()
      require("Navigator").setup({})
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
    "nvim-lualine/lualine.nvim",
    event = "VeryLazy",
    opts = {
      options = {
        icons_enabled = true,
        theme = "gruvbox-material",
      },
    },
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
          lualine_x = {},
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
    "mbbill/undotree",
    keys = {
      { "<S-u>", "<cmd>UndotreeToggle<cr>", desc = "Toggle undotree" },
    },
  },
  -- avante
  {
    "yetone/avante.nvim",
    init = function()
      require("avante_lib").load()
    end,
    event = "VeryLazy",
    opts = {
      hints = { enabled = false },
      mappings = {
        submit = {
          normal = "<C-CR>",
          insert = "<C-CR>",
        },
      },
    },
    keys = {
      { "<C-a>", "<cmd>AvanteToggle<cr>", desc = "Toggle Avante" },
    },
    build = LazyVim.is_win() and "powershell -ExecutionPolicy Bypass -File Build.ps1 -BuildFromSource false" or "make",
  },
  {
    "MeanderingProgrammer/render-markdown.nvim",
    optional = true,
    ft = function(_, ft)
      vim.list_extend(ft, { "Avante" })
    end,
  },
  {
    "folke/which-key.nvim",
    optional = true,
    opts = {
      spec = {
        { "<leader>a", group = "ai" },
      },
    },
  },
  {
    "echasnovski/mini.files",
    opts = {
      options = {
        use_as_default_explorer = true,
      },
    },
  },
}
