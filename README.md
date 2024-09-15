<h1 align="center">SuperWhisper for Alfred</h1>
<p align="center"><strong>Use Alfred to Control <a href="https://superwhisper.com/">SuperWhisper</a> - AI Powered Voice to Text</strong></p>
<p align="center">
    <img width="300" src="Workflow/assets/superwhisper.png">
</p>

## ABOUT
This Alfred workflow is designed to enhance your experience with [SuperWhisper](https://superwhisper.com/), an INCREDIBLE AI-powered text tool that offers dictation/transcription capabilities and access to both local and cloud language models. Please note that this workflow is not official and serves as an alternative for controlling SuperWhisper efficiently.

---

<p align="center">
  <img width="800" src="Workflow/assets/001.png">
</p>

## MAIN FEATURES
- Quickly **open SuperWhisper's settings**.

- **Change recording modes** with ease.

- **Start or stop recording** directly from within Alfred.

- **Activate and start recording** in a specific mode instantly.

- **Customizable hotkeys** to activate and record in user-defined modes.

- Conveniently **access SuperWhisper's history** panel.

- Use Alfred’s textview to o**pen your last result from SuperWhisper**, or to **see a parsed version of the last JSON file** (convenient for debugging).

- **Set two favorite modes and quickly start recording** on them from the main menu (or with custom hotkeys/external trigger).

- While on the main menu, **press CMD C on any option to copy the last SuperWhisper result to your clipboard**, or press CMD Y to have a ‘quick-look’ of your JSON file.

- Fully control the workflow using **Alfred's bar, keyboard shortcuts, or an external trigger.**

- **Supports fuzzy search and filtering.** This allows you to—for example—filter ‘Super Mode’ by simply typing ‘sm’ while in the modes menu.

- If you have [Keyboard Maestro](https://www.keyboardmaestro.com/), a macro can be triggered by the workflow to always display your current mode on your MenuBar.

---
## REQUIREMENTS

* [SuperWhisper](https://superwhisper.com/) has to be running. 
  
* This workflow utilizes Python 3 to filter its menus. If you don't have it, it may prompt you to install Xcode Command Line Tools for this, or you can install it by running `xcode-select --install` in Terminal. Python is a widely used programming language recognized for its safety and reliability, commonly utilized in Alfred workflows, [Homebrew](https://brew.sh/), and more.
  
* In the configuration settings, there are three experimental options: "Super Mode", "History," and "Show Mode in Menu Bar." To access these, ensure SuperWhisper's menu icon is visible. Please be aware that this feature relies on AppleScript, and compatibility with system in languages other than English may vary.

* The third experimental option, "Show Mode in Menu Bar," requires importing [this Keyboard Maestro macro group](https://github.com/ognistik/alfred-superwhisper/blob/main/Workflow/assets/MenuBar.kmmacros.zip?raw=true) into KM. The group contains one empty macro, which you can delete (it's necessary for exporting as a group). To keep the mode updated on your menu bar, make sure you only switch modes using this workflow. If you don't have Keyboard Maestro installed, avoid activating this option to prevent potential errors.

---

<p align="center">
  <img width="800" src="Workflow/assets/002.png">
</p>

## HOW TO
Controlling this workflow is straightforward, but there are some things to consider:

* All available Hotkeys have notes to indicate their function.

* Both the main menu and modes menu have additional options with modifiers. Make sure to read and familiarize yourself with these to make the most of the workflow.

* Hotkeys have been color-coded as follows:
  * Blue: Quick access to the workflow menus and its main options.
  * Yellow: Non-essential, but convenient for pro-users
  * Orange: They activate and record in specific modes.

---
### “CUSTOM MODE” HOTKEYS
In addition to the two favorite modes and super mode hotkeys, users can set up six additional hotkeys. If you need more than six or require options—like activating a mode without triggering record—, consider using the external trigger. This prevents potential functionality loss with future workflow updates.

**To set up your custom hotkeys you need to:**
1. Open the modes menu in Alfred.
2. CMD C on your chosen mode to copy its deep link.
3. Go into Alfred’s settings, SuperWhisper’s workflow editor, and double click the variables block (pink color-coded) next to the hotkey you want to setup. 
4. Paste the deep link in the right field of `theUrl`.
5. Double click the hotkey block and choose your favorite keyboard shortcut :)

---
### THE EXTERNAL TRIGGER
Using [the external trigger](https://www.alfredapp.com/help/workflows/triggers/external/) provides total control over this workflow's features, whether you're automating tasks, maximizing functionality, or seeking additional custom hotkeys. You can utilize the external trigger through either Alfred's AppleScript or URL scheme. 

> This workflow’s external trigger is `sw` .

**To activate and/or record with different modes, `sw` expects the following parameters comma separated:**
`[action],[deepLink],[modeName]`

**Use those placeholders as follows:**
* `[action]` can be `openModeRecord` to activate and record, or `openMode` to simply activate the given mode.
  * **There is an exception.** If you want to trigger 'Super Mode’ externally, `[action]` can be `activateSuperM`, or `activateRecordSuperM` . No additional arguments are necessary for this case.
* You can grab the `[deepLink]` of your mode as mentioned above, from within the modes menu.
* `[modeName]` is only used for the notifications, in those cases that you activate the mode without recording.

**Examples:**
* `openModeRecord,superwhisper://mode?key=custom-HWEE` 
* `openMode,superwhisper://mode?key=custom-HWEE,Dictate in English` 
* `activateSuperM`

<details>
  <summary><b>👇️ Additionally, `sw` can receive any of the the following arguments:</b></summary>

| The Argument         | The Action                                                   |
|----------------------|--------------------------------------------------------------|
|                      | If there’s no argument sent. The main menu of the workflow will open. |
| `selectMode`         | Opens the modes menu.                                        |
| `settings`           | Opens SuperWhisper’s settings.                               |
| `wsettings`          | Opens the workflow’s configuration window.                   |
| `revealModes`        | Reveals the modes folder in Finder.                          |
| `record`             | Toggles Recording                                            |
| `activateRecordFavA` | Activates and records on favorite mode “A”                   |
| `activateRecordFavB` | Activates and records on favorite mode “B”                   |
| `history`            | Opens history tab in SuperWhisper                            |
| `viewLastResult`     | Opens the last result in Alfred’s TextView. It will try to get the LLM Result. If no LLM was used, it will get the transcribed dictation. |
| `copyLast`           | Copies the last result to your clipboard.                    |
| `viewLastJSON`       | Opens a parsed version of the last JSON file in Alfred’s TextView. |
| `revealJson`         | Reveals the last JSON file in Finder.                        |

</details>

---
## CLOSING
Please be aware that since this workflow is non-official, it may require occasional fine-tuning due to updates or unforeseen bugs. Your feedback and contributions are highly appreciated to improve its functionality.

*If you found this workflow useful,  how about [buying me a coffee](https://www.buymeacoffee.com/afadingthought)?*