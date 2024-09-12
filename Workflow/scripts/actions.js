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

    function processLatestMetaJson() {
        const fileManager = $.NSFileManager.defaultManager;
        const error = $();
        
        // Get contents of the recDir
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
                        const datetimeObj = new Date(jsonContent.datetime);
                        if (!isNaN(datetimeObj.getTime())) {
                            formattedDatetime = datetimeObj.getFullYear() + '-' + 
                                                String(datetimeObj.getMonth() + 1).padStart(2, '0') + '-' +
                                                String(datetimeObj.getDate()).padStart(2, '0') + ' • ' +
                                                String(datetimeObj.getHours() % 12 || 12).padStart(2, '0') + ':' +
                                                String(datetimeObj.getMinutes()).padStart(2, '0') + ':' +
                                                String(datetimeObj.getSeconds()).padStart(2, '0') + ' ' +
                                                (datetimeObj.getHours() >= 12 ? 'PM' : 'AM');
                        }
                    }
                    
                    // Extract llmResult
                    const llmResult = jsonContent.llmResult || '';
                    const simpleResult = jsonContent.result || '';
                    
                    // Create formatted string of all objects except 'segments' and 'datetime'
                    let formattedString = '';
                    for (const [key, value] of Object.entries(jsonContent)) {
                        if (key !== 'segments' && key !== 'datetime' && key !== 'segments' && key !== 'appVersion') {
                            formattedString += `## ${key}\n${value !== undefined && value !== null ? value : 'N/A'}\n---\n`;
                        }
                    }
                    
                    return {
                        latestJson: metaJsonPath,
                        datetime: formattedDatetime,
                        llmResult: llmResult,
                        result: simpleResult,
                        formattedContent: formattedString.trim()
                    };
                } catch (parseError) {
                    continue;
                }
            }
        }
        
        // If no valid meta.json file is found in the 30 most recent folders
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
                        theUrl: result.latestJson
                    }
                }
            });
        }
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
    }
}