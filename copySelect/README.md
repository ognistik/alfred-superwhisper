# copySelect
*A SuperWhisper clipboard helper*

SuperWhisper is a powerful voice-to-text application with advanced features like user context recognition and clipboard text utilization. This small command-line utility enhances SuperWhisper's functionality by automatically copying selected text when triggered.

## What this Does:
- Using the accessibility API copies selected text when run.
- Does nothing if no text is selected.
- By turning on “use copied text” in SuperWhisper, you can now use any mode in a similar way as *Super Mode*... simply selecting text and using it as context.
- Can be used independently or with other applications.

This tool addresses the time constraint in SuperWhisper's clipboard feature by eliminating the need to manually copy text before triggering audio recording. It's particularly useful when combined with this Alfred workflow which triggers SuperWhisper’s recording using the URL Scheme “superwhisper://record”

## Technical Notes:
- Since this uses accessibility, it both requires special permissions, and it may not work in every app.
- This is my first attempt at using or compiling anything with Swift.
- Users may need to approve the application's use due to it being unsigned.
- I am sharing the source code for others to compile themselves or modify for their needs.

Feel free to incorporate this utility into your workflows or use it as you see fit.