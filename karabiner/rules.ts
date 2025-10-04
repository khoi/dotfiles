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
  {
    description: "HHKB Layout (Right Shift + Key)",
    manipulators: [
      {
        description: "Right Shift + Open Bracket -> Up Arrow",
        from: {
          key_code: "open_bracket",
          modifiers: {
            mandatory: ["right_shift"],
          },
        },
        to: [{ key_code: "up_arrow" }],
        type: "basic",
      },
      {
        description: "Right Shift + Slash -> Down Arrow",
        from: {
          key_code: "slash",
          modifiers: {
            mandatory: ["right_shift"],
          },
        },
        to: [{ key_code: "down_arrow" }],
        type: "basic",
      },
      {
        description: "Right Shift + Quote -> Right Arrow",
        from: {
          key_code: "quote",
          modifiers: {
            mandatory: ["right_shift"],
          },
        },
        to: [{ key_code: "right_arrow" }],
        type: "basic",
      },
      {
        description: "Right Shift + Semicolon -> Left Arrow",
        from: {
          key_code: "semicolon",
          modifiers: {
            mandatory: ["right_shift"],
          },
        },
        to: [{ key_code: "left_arrow" }],
        type: "basic",
      },
      {
        description: "Right Shift + P -> Pause",
        from: {
          key_code: "p",
          modifiers: {
            mandatory: ["right_shift"],
          },
        },
        to: [{ key_code: "pause" }],
        type: "basic",
      },
      {
        description: "Right Shift + O -> Scroll Lock",
        from: {
          key_code: "o",
          modifiers: {
            mandatory: ["right_shift"],
          },
        },
        to: [{ key_code: "scroll_lock" }],
        type: "basic",
      },
      {
        description: "Right Shift + I -> Print Screen",
        from: {
          key_code: "i",
          modifiers: {
            mandatory: ["right_shift"],
          },
        },
        to: [{ key_code: "print_screen" }],
        type: "basic",
      },
      {
        description: "Right Shift + Period -> Page Down",
        from: {
          key_code: "period",
          modifiers: {
            mandatory: ["right_shift"],
          },
        },
        to: [{ key_code: "page_down" }],
        type: "basic",
      },
      {
        description: "Right Shift + L -> Page Up",
        from: {
          key_code: "l",
          modifiers: {
            mandatory: ["right_shift"],
          },
        },
        to: [{ key_code: "page_up" }],
        type: "basic",
      },
      {
        description: "Right Shift + Comma -> End",
        from: {
          key_code: "comma",
          modifiers: {
            mandatory: ["right_shift"],
          },
        },
        to: [{ key_code: "end" }],
        type: "basic",
      },
      {
        description: "Right Shift + 0 -> Delete Forward",
        from: {
          key_code: "0",
          modifiers: {
            mandatory: ["right_shift"],
          },
        },
        to: [{ key_code: "delete_forward" }],
        type: "basic",
      },
      {
        description: "Right Shift + A -> Volume Decrement",
        from: {
          key_code: "a",
          modifiers: {
            mandatory: ["right_shift"],
          },
        },
        to: [{ key_code: "volume_decrement" }],
        type: "basic",
      },
      {
        description: "Right Shift + S -> Volume Increment",
        from: {
          key_code: "s",
          modifiers: {
            mandatory: ["right_shift"],
          },
        },
        to: [{ key_code: "volume_increment" }],
        type: "basic",
      },
      {
        description: "Right Shift + D -> Mute",
        from: {
          key_code: "d",
          modifiers: {
            mandatory: ["right_shift"],
          },
        },
        to: [{ key_code: "mute" }],
        type: "basic",
      },
      {
        description: "Right Shift + F -> Eject",
        from: {
          key_code: "f",
          modifiers: {
            mandatory: ["right_shift"],
          },
        },
        to: [{ key_code: "eject" }],
        type: "basic",
      },
    ],
  },
  ...createHyperSubLayers({
    // o = "Open" applications
    o: {
      b: app("Safari"),
      x: app("Xcode"),
      c: app("Cursor"),
      s: app("Slack"),
      t: app("Ghostty"),
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
    // r = "Raycast"
    r: {
      k: openInBackground("raycast://extensions/rolandleth/kill-process/index"),
      c: openInBackground("raycast://extensions/raycast/raycast/confetti"),
      g: openInBackground(
        "raycast://ai-commands/fix-spelling-and-grammar-custom"
      ),
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
