//
//  main.swift
//  copySelect
//
//  Created by Robert J. P. Oberg on 9/16/24.
//

import Cocoa
import ApplicationServices

func requestAccessibilityPermission() {
    let options: NSDictionary = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true]
    let accessEnabled = AXIsProcessTrustedWithOptions(options)
    
    if !accessEnabled {
        NSLog("Accessibility permission is required. Please grant permission in System Preferences > Security & Privacy > Privacy > Accessibility.")
        NSLog("After granting permission, please run the application again.")
        exit(1)
    } else {
        NSLog("Accessibility permission is granted.")
    }
}

func checkTextSelectionAndCopyToClipboard() -> Bool {
    NSLog("Starting text selection check")
    
    guard let frontmostApp = NSWorkspace.shared.frontmostApplication else {
        NSLog("Failed to get frontmost application")
        return false
    }
    
    NSLog("Got frontmost application: \(frontmostApp.localizedName ?? "Unknown")")
    let app = AXUIElementCreateApplication(frontmostApp.processIdentifier)
    
    var focusedElement: AXUIElement?
    var value: CFTypeRef?
    let focusedElementResult = AXUIElementCopyAttributeValue(app, kAXFocusedUIElementAttribute as CFString, &value)
    
    NSLog("Focused element result: \(focusedElementResult.rawValue)")
    
    if focusedElementResult == .success {
        focusedElement = (value as! AXUIElement)
    } else {
        NSLog("Failed to get focused element. Error code: \(focusedElementResult.rawValue)")
        return false
    }
    
    guard let element = focusedElement else {
        NSLog("No focused element available")
        return false
    }
    
    // Try to get selected text
    value = nil
    var selectedTextResult = AXUIElementCopyAttributeValue(element, kAXSelectedTextAttribute as CFString, &value)
    
    // If getting selected text fails, try to get the value attribute
    if selectedTextResult != .success {
        selectedTextResult = AXUIElementCopyAttributeValue(element, kAXValueAttribute as CFString, &value)
    }
    
    NSLog("Selected text/value result: \(selectedTextResult.rawValue)")
    
    if selectedTextResult == .success, let text = value as? String, !text.isEmpty {
        NSLog("Selected text: \(text)")
        
        // Copy the selected text to clipboard
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.setString(text, forType: .string)
        NSLog("Copied selected text to clipboard")
        
        return true
    } else {
        NSLog("Failed to get selected text or text is empty. Error code: \(selectedTextResult.rawValue)")
    }
    
    return false
}

NSLog("Application started")
requestAccessibilityPermission()
if checkTextSelectionAndCopyToClipboard() {
    NSLog("Text is selected and copied to clipboard")
} else {
    NSLog("No text selected or failed to copy")
}
NSLog("Application finished")
