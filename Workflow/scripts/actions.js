ObjC.import('stdlib');
ObjC.import('Foundation');

function run(argv) {
    var query = argv[0];
    var swPath = $.getenv('swPath');
    theAction = $.getenv('theAction');
    var favModeA = $.getenv('favModeA');
    var favModeB = $.getenv('favModeB');
    const modesDir = swPath + '/modes';
    const recDir = swPath + '/recordings';

    try {
        theUrl = $.getenv('theUrl');
    } catch (error) {
        theUrl = '';
    }

    function processLatestMetaJson(specificJsonPath = null) {
        const fileManager = $.NSFileManager.defaultManager;
        const error = $();
        
        // If specific path provided, process that file directly
        if (specificJsonPath) {
            if (fileManager.fileExistsAtPath($(specificJsonPath))) {
                let fileContent;
                try {
                    fileContent = $.NSString.stringWithContentsOfFileEncodingError($(specificJsonPath), $.NSUTF8StringEncoding, $());
                    if (!fileContent) {
                        return { notFound: 1 };
                    }
                } catch (readError) {
                    return { notFound: 1 };
                }
                
                try {
                    const jsonContent = JSON.parse(fileContent.js);
                    
                    // Convert datetime
                    let formattedDatetime = 'N/A';
                    if (jsonContent.datetime) {
                        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                        const datetimeObj = new Date(jsonContent.datetime + 'Z'); // Append 'Z' to treat as UTC
                        if (!isNaN(datetimeObj.getTime())) {
                            const localDatetime = new Date(datetimeObj.toLocaleString("en-US", {timeZone: userTimezone}));
                            formattedDatetime = localDatetime.getFullYear() + '-' + 
                                                String(localDatetime.getMonth() + 1).padStart(2, '0') + '-' +
                                                String(localDatetime.getDate()).padStart(2, '0') + ' • ' +
                                                String(localDatetime.getHours() % 12 || 12).padStart(2, '0') + ':' +
                                                String(localDatetime.getMinutes()).padStart(2, '0') + ':' +
                                                String(localDatetime.getSeconds()).padStart(2, '0') + ' ' +
                                                (localDatetime.getHours() >= 12 ? 'PM' : 'AM');
                        }
                    }
                    
                    // Extract Values
                    const llmResult = jsonContent.llmResult || '';
                    const simpleResult = jsonContent.result || '';
                    const system = jsonContent.prompt || '';
                    
                    // Create formatted string of all objects except 'segments' and 'datetime'
                    const desiredOrder = ['prompt', 'rawResult', 'result', 'llmResult'];

                    let formattedString = '';
                    const entries = Object.entries(jsonContent);

                    // First, add the keys in the desired order
                    for (const key of desiredOrder) {
                        if (key in jsonContent) {
                            const value = jsonContent[key];
                            formattedString += `## ${key}\n${value !== undefined && value !== null ? value : 'N/A'}\n---\n`;
                        }
                    }

                    // Then, add the remaining keys in alphabetical order
                    entries
                        .filter(([key]) => !desiredOrder.includes(key) && key !== 'segments' && key !== 'datetime' && key !== 'appVersion')
                        .sort(([a], [b]) => a.localeCompare(b))
                        .forEach(([key, value]) => {
                            formattedString += `## ${key}\n${value !== undefined && value !== null ? value : 'N/A'}\n---\n`;
                        });
                    
                    return {
                        latestJson: specificJsonPath,
                        datetime: formattedDatetime,
                        llmResult: llmResult,
                        result: simpleResult,
                        system: system,
                        formattedContent: formattedString.trim()
                    };
                } catch (parseError) {
                    return { notFound: 1 };
                }
            }
            return { notFound: 1 };
        }
        
        // Original functionality when no specific path is provided
        const contents = fileManager.contentsOfDirectoryAtPathError($(recDir), error);
        
        if (error.code) {
            return { notFound: 1 };
        }
        
        // Sort contents to get the latest folders
        const sortedContents = ObjC.unwrap(contents).sort((a, b) => {
            return ObjC.unwrap(b).localeCompare(ObjC.unwrap(a));
        });

        if (sortedContents.length === 0) {
            return { notFound: 1 };
        }

        // Iterate through the 30 most recent folders or less if there are fewer folders
        const foldersToCheck = Math.min(30, sortedContents.length);

        for (let i = 0; i < foldersToCheck; i++) {
            const folder = ObjC.unwrap(sortedContents[i]);
            const metaJsonPath = recDir + '/' + folder + '/meta.json';

            if (fileManager.fileExistsAtPath($(metaJsonPath))) {
                let fileContent;
                try {
                    fileContent = $.NSString.stringWithContentsOfFileEncodingError($(metaJsonPath), $.NSUTF8StringEncoding, $());
                    if (!fileContent) {
                        continue;
                    }
                } catch (readError) {
                    continue;
                }
                
                try {
                    const jsonContent = JSON.parse(fileContent.js);
                    
                    // Convert datetime
                    let formattedDatetime = 'N/A';
                    if (jsonContent.datetime) {
                        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                        const datetimeObj = new Date(jsonContent.datetime + 'Z'); // Append 'Z' to treat as UTC
                        if (!isNaN(datetimeObj.getTime())) {
                            const localDatetime = new Date(datetimeObj.toLocaleString("en-US", {timeZone: userTimezone}));
                            formattedDatetime = localDatetime.getFullYear() + '-' + 
                                                String(localDatetime.getMonth() + 1).padStart(2, '0') + '-' +
                                                String(localDatetime.getDate()).padStart(2, '0') + ' • ' +
                                                String(localDatetime.getHours() % 12 || 12).padStart(2, '0') + ':' +
                                                String(localDatetime.getMinutes()).padStart(2, '0') + ':' +
                                                String(localDatetime.getSeconds()).padStart(2, '0') + ' ' +
                                                (localDatetime.getHours() >= 12 ? 'PM' : 'AM');
                        }
                    }
                    
                    // Extract Values
                    const llmResult = jsonContent.llmResult || '';
                    const simpleResult = jsonContent.result || '';
                    const system = jsonContent.prompt || '';
                    
                    // Create formatted string of all objects except 'segments' and 'datetime'
                    const desiredOrder = ['prompt', 'rawResult', 'result', 'llmResult'];

                    let formattedString = '';
                    const entries = Object.entries(jsonContent);

                    // First, add the keys in the desired order
                    for (const key of desiredOrder) {
                        if (key in jsonContent) {
                            const value = jsonContent[key];
                            formattedString += `## ${key}\n${value !== undefined && value !== null ? value : 'N/A'}\n---\n`;
                        }
                    }

                    // Then, add the remaining keys in alphabetical order
                    entries
                        .filter(([key]) => !desiredOrder.includes(key) && key !== 'segments' && key !== 'datetime' && key !== 'appVersion')
                        .sort(([a], [b]) => a.localeCompare(b))
                        .forEach(([key, value]) => {
                            formattedString += `## ${key}\n${value !== undefined && value !== null ? value : 'N/A'}\n---\n`;
                        });
                    
                    return {
                        latestJson: metaJsonPath,
                        datetime: formattedDatetime,
                        llmResult: llmResult,
                        result: simpleResult,
                        system: system,
                        formattedContent: formattedString.trim()
                    };
                } catch (parseError) {
                    continue;
                }
            }
        }
        
        return { notFound: 1 };
    }

    if (theAction === 'history') {
        var appleScript = `
            tell application "System Events" to tell process "superwhisper"
                click menu item "History..." of menu "superwhisper" of menu bar item 1 of menu bar 2 of application process "superwhisper" of application "System Events"
            end tell
        `;
        
        var app = Application.currentApplication();
        app.includeStandardAdditions = true;
        app.doShellScript('osascript -e \'' + appleScript.replace(/'/g, "'\"'\"'") + '\'');
        return JSON.stringify({
            alfredworkflow: {
                variables: {
                    theAction: 'closeAlfred',
                }
            }
        });
    } else if (theAction === 'activateSuperM') {
        var appleScript = `
            tell application "System Events" to tell process "superwhisper"
            click menu item "Super" of menu "Select Mode" of menu item "Select Mode" of menu "superwhisper" of menu bar item 1 of menu bar 2 of application process "superwhisper" of application "System Events"
            end tell
        `;
        
        var app = Application.currentApplication();
        app.includeStandardAdditions = true;
        app.doShellScript('osascript -e \'' + appleScript.replace(/'/g, "'\"'\"'") + '\'');
        
        return JSON.stringify({
            alfredworkflow: {
                variables: {
                    theAction: 'openMode',
                    theUrl: '',
                    noti: 'Super Mode has been activated.'
                }
            }
        });

    } else if (theAction === 'activateRecordSuperM') {
        var appleScript = `
            tell application "System Events" to tell process "superwhisper"
            click menu item "Super" of menu "Select Mode" of menu item "Select Mode" of menu "superwhisper" of menu bar item 1 of menu bar 2 of application process "superwhisper" of application "System Events"
            click menu item "Start/Stop Recording" of menu "superwhisper" of menu bar item 1 of menu bar 2 of application process "superwhisper" of application "System Events"
            end tell
        `;
        
        var app = Application.currentApplication();
        app.includeStandardAdditions = true;
        app.doShellScript('osascript -e \'' + appleScript.replace(/'/g, "'\"'\"'") + '\'');

        return JSON.stringify({
            alfredworkflow: {
                variables: {
                    noti: '',
                    theAction: 'openModeRecord'
                }
            }
        });
    } else if (theAction === 'record') {
        return JSON.stringify({
            alfredworkflow: {
                variables: {
                    theAction: 'open',
                    theUrl: 'superwhisper://record'
                }
            }
        });
    } else if (theAction === 'revealModes') {
        return JSON.stringify({
            alfredworkflow: {
                variables: {
                    theAction: 'reveal',
                    theUrl: modesDir
                }
            }
        });
    } else if (theAction === 'settings') {
        return JSON.stringify({
            alfredworkflow: {
                variables: {
                    theAction: 'open',
                    theUrl: 'superwhisper://settings'
                }
            }
        });
    } else if (theAction === 'wsettings') {
        return JSON.stringify({
            alfredworkflow: {
                variables: {
                    theAction: 'open',
                    theUrl: 'superwhisper://settings'
                }
            }
        });
    } else if (theAction === 'activateRecordFavA') {
        if (favModeA === '') {
            return JSON.stringify({
                alfredworkflow: {
                    variables: {
                        theAction: '',
                        noti: 'Favorite mode "A" has not been set.'
                    }
                }
            });
        } else if (favModeA === 'activateRecordSuperM') {
            var appleScript = `
            tell application "System Events" to tell process "superwhisper"
            click menu item "Super" of menu "Select Mode" of menu item "Select Mode" of menu "superwhisper" of menu bar item 1 of menu bar 2 of application process "superwhisper" of application "System Events"
            end tell
            `;
            
            var app = Application.currentApplication();
            app.includeStandardAdditions = true;
            app.doShellScript('osascript -e \'' + appleScript.replace(/'/g, "'\"'\"'") + '\'');

            return JSON.stringify({
                alfredworkflow: {
                    variables: {
                        noti: '',
                        theUrl: 'superwhisper://record',
                        theAction: 'open'
                    }
                }
            });
        } else {
            return JSON.stringify({
                alfredworkflow: {
                    variables: {
                        theAction: 'openModeRecord',
                        theUrl: favModeA
                    }
                }
            });
        }
    } else if (theAction === 'activateRecordFavB') {
        if (favModeB === '') {
            return JSON.stringify({
                alfredworkflow: {
                    variables: {
                        theAction: '',
                        noti: 'Favorite mode "B" has not been set.'
                    }
                }
            });
        } else if (favModeB === 'activateRecordSuperM') {
            var appleScript = `
            tell application "System Events" to tell process "superwhisper"
            click menu item "Super" of menu "Select Mode" of menu item "Select Mode" of menu "superwhisper" of menu bar item 1 of menu bar 2 of application process "superwhisper" of application "System Events"
            click menu item "Start/Stop Recording" of menu "superwhisper" of menu bar item 1 of menu bar 2 of application process "superwhisper" of application "System Events"
            end tell
            `;
            
            var app = Application.currentApplication();
            app.includeStandardAdditions = true;
            app.doShellScript('osascript -e \'' + appleScript.replace(/'/g, "'\"'\"'") + '\'');

            return JSON.stringify({
                alfredworkflow: {
                    variables: {
                        noti: '',
                        theUrl: 'superwhisper://record',
                        theAction: 'open'
                    }
                }
            });
        } else {
            return JSON.stringify({
                alfredworkflow: {
                    variables: {
                        theAction: 'openModeRecord',
                        theUrl: favModeB
                    }
                }
            });
        }
    } else if (theAction === 'viewResult') {
        const result = processLatestMetaJson(theUrl);
        return JSON.stringify({
            alfredworkflow: {
                variables: {
                    theAction: 'textView',
                    theContent: '# ' + result.datetime + '\n---\n\n' + (result.llmResult !== '' ? result.llmResult : result.result),
                    copyContent: result.llmResult !== '' ? result.llmResult : result.result,
                    theVoice: result.result,
                    theResult: result.llmResult !== '' ? result.llmResult : result.result,
                    theSystem: result.system,
                    theUrl: result.latestJson
                }
            }
        });
    } else if (theAction === 'viewVoice') {
        const result = processLatestMetaJson(theUrl);
        return JSON.stringify({
            alfredworkflow: {
                variables: {
                    theAction: 'textView',
                    theContent: '# ' + result.datetime + '\n---\n\n' + result.result,
                    copyContent: result.result,
                    theVoice: result.result,
                    theResult: result.llmResult !== '' ? result.llmResult : result.result,
                    theSystem: result.system,
                    theUrl: result.latestJson
                }
            }
        });
    } else if (theAction === 'viewJSON') {
        const result = processLatestMetaJson(theUrl);
        return JSON.stringify({
            alfredworkflow: {
                variables: {
                    theAction: 'textView',
                    theContent: '# ' + result.datetime + '\n---\n\n' + result.formattedContent,
                    copyContent: result.formattedContent,
                    theVoice: result.result,
                    theResult: result.llmResult !== '' ? result.llmResult : result.result,
                    theSystem: result.system,
                    theUrl: result.latestJson
                }
            }
        });
    } else if (theAction === 'viewLastResult') {
        const result = processLatestMetaJson();
        if (result.notFound === 1) {
            return JSON.stringify({
                alfredworkflow: {
                    variables: {
                        theAction: '',
                        noti: 'JSON file not found.'
                    }
                }
            });
        } else if (result.result === '') {
            return JSON.stringify({
                alfredworkflow: {
                    variables: {
                        theAction: '',
                        noti: 'Result value not found.'
                    }
                }
            });
        } else {
            return JSON.stringify({
                alfredworkflow: {
                    variables: {
                        theAction: 'textView',
                        theContent: '# ' + result.datetime + '\n---\n\n' + (result.llmResult !== '' ? result.llmResult : result.result),
                        copyContent: result.llmResult !== '' ? result.llmResult : result.result,
                        theVoice: result.result,
                        theResult: result.llmResult !== '' ? result.llmResult : result.result,
                        theSystem: result.system,
                        theUrl: result.latestJson
                    }
                }
            });
        }
    } else if (theAction === 'viewLastJSON') {
        const result = processLatestMetaJson();
        if (result.notFound === 1) {
            return JSON.stringify({
                alfredworkflow: {
                    variables: {
                        theAction: '',
                        noti: 'JSON file not found.'
                    }
                }
            });
        } else {
            return JSON.stringify({
                alfredworkflow: {
                    variables: {
                        theAction: 'textView',
                        theContent: '# ' + result.datetime + '\n---\n\n' + result.formattedContent,
                        copyContent: result.formattedContent,
                        theVoice: result.result,
                        theResult: result.llmResult !== '' ? result.llmResult : result.result,
                        theSystem: result.system,
                        theUrl: result.latestJson
                    }
                }
            });
        }
    } else if (theAction === 'editLastResult') {
        const result = processLatestMetaJson();
        if (result.notFound === 1) {
            return JSON.stringify({
                alfredworkflow: {
                    variables: {
                        theAction: '',
                        noti: 'JSON file not found.'
                    }
                }
            });
        } else if (result.result === '') {
            return JSON.stringify({
                alfredworkflow: {
                    variables: {
                        theAction: '',
                        noti: 'Result value not found.'
                    }
                }
            });
        } else {
            return JSON.stringify({
                alfredworkflow: {
                    variables: {
                        theAction: 'editView',
                        theContent: result.llmResult !== '' ? result.llmResult : result.result,
                        copyContent: result.llmResult !== '' ? result.llmResult : result.result
                    }
                }
            });
        }
    } else if (theAction === 'copyChat') {
        const result = processLatestMetaJson(theUrl);
        return JSON.stringify({
            alfredworkflow: {
                variables: {
                    copyContent: '## USER\n' + result.result + '\n\n' + '## AI\n' + (result.llmResult !== '' ? result.llmResult : result.result) + '\n\n---\n'
                }
            }
        });
    } else if (theAction === 'copyLongChat') {
        const result = processLatestMetaJson(theUrl);
        return JSON.stringify({
            alfredworkflow: {
                variables: {
                    copyContent: '## SYSTEM\n' + result.system + '\n\n## USER\n' + result.result + '\n\n' + '## AI\n' + (result.llmResult !== '' ? result.llmResult : result.result) + '\n\n---\n'
                }
            }
        });
    } else if (theAction === 'copyLast') {
        const result = processLatestMetaJson();
        if (result.notFound === 1) {
            return JSON.stringify({
                alfredworkflow: {
                    variables: {
                        theAction: '',
                        noti: 'JSON file not found.'
                    }
                }
            });
        } else if (result.result === '') {
            return JSON.stringify({
                alfredworkflow: {
                    variables: {
                        theAction: '',
                        noti: 'Result value not found.'
                    }
                }
            });
        } else {
            return JSON.stringify({
                alfredworkflow: {
                    variables: {
                        copyContent: result.llmResult !== '' ? result.llmResult : result.result,
                    }
                }
            });
        }
    } else if (theAction === 'revealJson') {
        const result = processLatestMetaJson();
        if (result.notFound === 1) {
            return JSON.stringify({
                alfredworkflow: {
                    variables: {
                        theAction: '',
                        noti: 'JSON file not found.'
                    }
                }
            });
        } else {
            return JSON.stringify({
                alfredworkflow: {
                    variables: {
                        theAction: 'reveal',
                        theUrl: result.latestJson
                    }
                }
            });
        }
    } else if (theAction.startsWith('paste')) {
        const result = processLatestMetaJson();
        if (result.notFound === 1) {
            return JSON.stringify({
                alfredworkflow: {
                    variables: {
                        theAction: '',
                        noti: 'JSON file not found.'
                    }
                }
            });
        } else {
            return JSON.stringify({
                alfredworkflow: {
                    variables: {
                        prompt: result.result,
                        result: result.llmResult !== '' ? result.llmResult : result.result,
                        system: result.system
                    }
                }
            });
        }
    }
}