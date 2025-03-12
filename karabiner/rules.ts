import fs from "fs";
import { KarabinerRules } from "./types";
import { createHyperSubLayers, app, openInBackground } from "./utils";

const rules: KarabinerRules[] = [
  {
    description: "Hyper Key (⌃⌥⇧⌘)",
    manipulators: [
      {
        description: "Hyper Key",
        from: {
          key_code: "right_option",
          modifiers: {
            optional: ["any"],
          },
        },
        to: [
          {
            set_variable: {
              name: "hyper",
              value: 1,
            },
          },
        ],
        to_after_key_up: [
          {
            set_variable: {
              name: "hyper",
              value: 0,
            },
          },
        ],
        type: "basic",
      },
    ],
  },
  {
    description: "CapsLock To Control (on hold) / ESC (tap)",
    manipulators: [
      {
        description: "CapsLock to Control",
        from: {
          key_code: "caps_lock",
          modifiers: {
            optional: ["any"],
          },
        },
        to: [
          {
            key_code: "left_control",
          },
        ],
        to_if_alone: [
          {
            key_code: "escape",
          },
        ],
        type: "basic",
      },
    ],
  },
  ...createHyperSubLayers({
    // o = "Open" applications
    o: {
      1: app("1Password"),
      a: app("Arc"),
      x: app("Xcode"),
      c: app("Cursor"),
      s: app("Slack"),
      t: app("WezTerm"),
      f: app("Finder"),
      w: app("WhatsApp"),
      e: app("Telegram"),
    },

    // w = "windows"
    w: {
      n: openInBackground(
        "raycast://extensions/raycast/window-management/next-display"
      ),
      p: openInBackground(
        "raycast://extensions/raycast/window-management/previous-display"
      ),
      k: openInBackground(
        "raycast://extensions/raycast/window-management/top-half"
      ),
      j: openInBackground(
        "raycast://extensions/raycast/window-management/bottom-half"
      ),
      h: openInBackground(
        "raycast://extensions/raycast/window-management/left-half"
      ),
      l: openInBackground(
        "raycast://extensions/raycast/window-management/right-half"
      ),
      f: openInBackground(
        "raycast://extensions/raycast/window-management/maximize"
      ),
    },

    // s = "System"
    s: {
      equal_sign: {
        to: [
          {
            key_code: "volume_increment",
          },
        ],
      },
      hyphen: {
        to: [
          {
            key_code: "volume_decrement",
          },
        ],
      },
      0: {
        to: [
          {
            key_code: "mute",
          },
        ],
      },
      close_bracket: {
        to: [
          {
            key_code: "display_brightness_increment",
          },
        ],
      },
      open_bracket: {
        to: [
          {
            key_code: "display_brightness_decrement",
          },
        ],
      },
      k: {
        to: [
          {
            key_code: "play_or_pause",
          },
        ],
      },
    },

    v: {
      h: {
        to: [{ key_code: "left_arrow" }],
      },
      j: {
        to: [{ key_code: "down_arrow" }],
      },
      k: {
        to: [{ key_code: "up_arrow" }],
      },
      l: {
        to: [{ key_code: "right_arrow" }],
      },
      u: {
        to: [{ key_code: "page_up" }],
      },
      d: {
        to: [{ key_code: "page_down" }],
      },
    },

    // r = "Raycast"
    r: {
      k: openInBackground("raycast://extensions/rolandleth/kill-process/index"),
      c: openInBackground("raycast://extensions/raycast/raycast/confetti"),
      g: openInBackground("raycast://ai-commands/fix-spelling-and-grammar"),
      p: openInBackground(
        "raycast://extensions/raycast/navigation/search-menu-items"
      ),
      h: openInBackground(
        "raycast://extensions/raycast/clipboard-history/clipboard-history"
      ),
      d: openInBackground(
        "raycast://extensions/raycast/system/toggle-system-appearance"
      ),
    },
  }),
  {
    description: "Super Duper Mode mappings",
    manipulators: [
      {
        type: "basic",
        from: {
          simultaneous: [{ key_code: "s" }, { key_code: "d" }],
          modifiers: { optional: ["any"] },
        },
        to: [{ set_variable: { name: "super_duper_mode", value: 1 } }],
        to_after_key_up: [
          { set_variable: { name: "super_duper_mode", value: 0 } },
        ],
        parameters: {
          "basic.simultaneous_threshold_milliseconds": 50,
        },
      },
      {
        type: "basic",
        from: { key_code: "h", modifiers: { optional: ["any"] } },
        conditions: [
          { type: "variable_if", name: "super_duper_mode", value: 1 },
        ],
        to: [{ key_code: "left_arrow" }],
      },
      {
        type: "basic",
        from: { key_code: "j", modifiers: { optional: ["any"] } },
        conditions: [
          { type: "variable_if", name: "super_duper_mode", value: 1 },
        ],
        to: [{ key_code: "down_arrow" }],
      },
      {
        type: "basic",
        from: { key_code: "k", modifiers: { optional: ["any"] } },
        conditions: [
          { type: "variable_if", name: "super_duper_mode", value: 1 },
        ],
        to: [{ key_code: "up_arrow" }],
      },
      {
        type: "basic",
        from: { key_code: "l", modifiers: { optional: ["any"] } },
        conditions: [
          { type: "variable_if", name: "super_duper_mode", value: 1 },
        ],
        to: [{ key_code: "right_arrow" }],
      },
      {
        type: "basic",
        from: { key_code: "a", modifiers: { optional: ["any"] } },
        conditions: [
          { type: "variable_if", name: "super_duper_mode", value: 1 },
        ],
        to: [{ key_code: "left_option" }],
      },
      {
        type: "basic",
        from: { key_code: "f", modifiers: { optional: ["any"] } },
        conditions: [
          { type: "variable_if", name: "super_duper_mode", value: 1 },
        ],
        to: [{ key_code: "left_command" }],
      },
      {
        type: "basic",
        from: { key_code: "spacebar", modifiers: { optional: ["any"] } },
        conditions: [
          { type: "variable_if", name: "super_duper_mode", value: 1 },
        ],
        to: [{ key_code: "left_shift" }],
      },
      {
        type: "basic",
        from: {
          simultaneous: [{ key_code: "a" }, { key_code: "j" }],
          modifiers: { optional: ["any"] },
        },
        conditions: [
          { type: "variable_if", name: "super_duper_mode", value: 1 },
        ],
        to: [{ key_code: "page_down" }],
        parameters: { "basic.simultaneous_threshold_milliseconds": 50 },
      },
      {
        type: "basic",
        from: {
          simultaneous: [{ key_code: "a" }, { key_code: "k" }],
          modifiers: { optional: ["any"] },
        },
        conditions: [
          { type: "variable_if", name: "super_duper_mode", value: 1 },
        ],
        to: [{ key_code: "page_up" }],
        parameters: { "basic.simultaneous_threshold_milliseconds": 50 },
      },
    ],
  },
];

fs.writeFileSync(
  `${process.env.HOME}/.config/karabiner/karabiner.json`,
  JSON.stringify(
    {
      global: {
        show_in_menu_bar: false,
      },
      profiles: [
        {
          name: "Default",
          virtual_hid_keyboard: { keyboard_type_v2: "ansi" },
          complex_modifications: {
            rules,
          },
        },
      ],
    },
    null,
    2
  )
);
