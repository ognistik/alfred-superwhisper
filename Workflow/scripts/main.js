ObjC.import('stdlib');
ObjC.import('Foundation');

function run(argv) {
    var query = argv[0];
    var swPath = $.getenv('swPath');
    var showSM = $.getenv('showSM');
    var favModeA = $.getenv('favModeA');
    var favModeAName = $.getenv('favModeAName');
    var favModeB = $.getenv('favModeB');
    var favModeBName = $.getenv('favModeBName');
    const modesDir = swPath + '/modes';
    const recDir = swPath + '/recordings';

    //This allows the same input to be reused
    try {
        theAction = $.getenv('theAction');
    } catch (error) {
        theAction = '';
    }

    function logToFile(message) {
        try {
            const desktopPath = $.NSSearchPathForDirectoriesInDomains($.NSDesktopDirectory, $.NSUserDomainMask, true).objectAtIndex(0).js;
            const logPath = desktopPath + '/superwhisper_log.txt';
            const fileManager = $.NSFileManager.defaultManager;
            
            if (!fileManager.fileExistsAtPath($(logPath))) {
                fileManager.createFileAtPathContentsAttributes($(logPath), $.NSData.alloc.init, null);
            }
            
            const fileHandle = $.NSFileHandle.fileHandleForWritingAtPath($(logPath));
            fileHandle.seekToEndOfFile;
            
            const logMessage = (new Date()).toISOString() + ': ' + message + '\n';
            const data = $.NSString.alloc.initWithUTF8String(logMessage).dataUsingEncoding($.NSUTF8StringEncoding);
            fileHandle.writeData(data);
            fileHandle.closeFile;
        } catch (error) {
            console.log('Error writing to log file: ' + error);
        }
    }

    function getModes() {
        const fileManager = $.NSFileManager.defaultManager;
        const modes = [];
    
        if (!fileManager.fileExistsAtPath(modesDir)) {
            return modes;
        }
    
        const error = $();
        const contents = fileManager.contentsOfDirectoryAtPathError(modesDir, error);
    
        if (error.code) {
            return modes;
        }
    
        for (let i = 0; i < contents.count; i++) {
            const file = ObjC.unwrap(contents.objectAtIndex(i));
    
            if (typeof file !== 'string' || !file.endsWith('.json')) {
                continue;
            }
    
            const filePath = modesDir + '/' + file;
            let fileContent;
    
            try {
                fileContent = $.NSString.stringWithContentsOfFileEncodingError(filePath, $.NSUTF8StringEncoding, $());
            } catch (readError) {
                continue;
            }
    
            if (!fileContent) {
                continue;
            }
            
            try {
                const jsonContent = JSON.parse(fileContent.js);
                if (jsonContent && jsonContent.name && jsonContent.key) {
                    modes.push({
                        name: jsonContent.name,
                        key: jsonContent.key,
                        filePath: filePath
                    });
                }
            } catch (parseError) {
                // Silently continue to the next file
            }
        }
    
        return modes;
    }

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
                    
                    // Extract llmResult
                    const llmResult = jsonContent.llmResult || '';
                    const simpleResult = jsonContent.result || '';
                    
                    // Create formatted string of all objects except 'segments' and 'datetime'
                    let formattedString = '';
                    for (const [key, value] of Object.entries(jsonContent)) {
                        if (key !== 'segments' && key !== 'datetime' && key !== 'appVersion') {
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

    const result = processLatestMetaJson();
    var items = [];

    if (theAction === '') {
        items.push({
            uid: 'settings',
            type: 'default',
            title: 'Settings',
            autocomplete: 'Settings',
            subtitle: '↩ Open SuperWhisper settings • ⌘↩ Open workflow settings',
            text: {
                    'copy': result.notFound === 1 ? '' : (result.llmResult !== '' ? result.llmResult : (result.result !== '' ? result.result : '')),
                },
            variables: { theAction: 'settings' },
            mods: {
                cmd: {
                    subtitle: 'Open workflow settings',
                    variables: { theAction: 'wsettings' }
                }
            },
            quicklookurl: result.notFound === 1 ? '' : result.latestJson
        });

        items.push({
            uid: 'modes',
            type: 'default',
            title: 'Modes',
            autocomplete: 'Modes',
            subtitle: '↩ Choose Mode • ⌘↩ Reveal in Finder',
            text: {
                'copy': result.notFound === 1 ? '' : (result.llmResult !== '' ? result.llmResult : (result.result !== '' ? result.result : '')),
            },
            variables: { theAction: 'selectMode' },
            quicklookurl: result.notFound === 1 ? '' : result.latestJson,
            mods: {
                cmd: {
                    subtitle: 'Reveal in Finder',
                    variables: {
                        theAction: 'revealModes',
                    }
                }}
        });

        items.push({
            uid: 'startRecording',
            type: 'default',
            title: 'Toggle Recording',
            autocomplete: 'Toggle Recording',
            subtitle: '↩ Toggle Recording' + (favModeA !== '' ? ' • ⌘↩ Record in "' + favModeAName + '"': '') + (favModeB !== '' ? ' • ⌥↩ Record in "' + favModeBName + '"': ''),
            text: {
                'copy': result.notFound === 1 ? '' : (result.llmResult !== '' ? result.llmResult : (result.result !== '' ? result.result : '')),
            },
            variables: { theAction: 'record' },
            quicklookurl: result.notFound === 1 ? '' : result.latestJson,
            ...(favModeA !== '' && favModeB !== '' && {
                mods: {
                    cmd: {
                        subtitle: `Activate & record in "${favModeAName}" mode`,
                        variables: { theAction: 'activateRecordFavA' }
                    },
                    alt: {
                        subtitle: `Activate & record in "${favModeBName}" mode`,
                        variables: { theAction: 'activateRecordFavB' }
                    }
                }
            }),
            ...(favModeA !== '' && favModeB === '' && {
                mods: {
                    cmd: {
                        subtitle: `Activate & record in "${favModeAName}" mode`,
                        variables: { theAction: 'activateRecordFavA' }
                    }
                }
            }),
            ...(favModeA === '' && favModeB !== '' && {
                mods: {
                    alt: {
                        subtitle: `Activate & record in "${favModeBName}" mode`,
                        variables: { theAction: 'activateRecordFavB' }
                    }
                }
           })
        });

        if ($.getenv('showHistory') === '1') {
            items.push({
                uid: 'history',
                type: 'default',
                title: 'History',
                autocomplete: 'History',
                subtitle: result.notFound === 1 ? 'View recording history' : '↩ View recording history ' + (result.llmResult !== '' ? '• ⌘↩ View last result ' : (result.result !== '' ? '• ⌘↩ View last result ' : '')) + '• ⌥↩ View last JSON contents',
                variables: { theAction: 'history' },
                text: {
                    'copy': result.notFound === 1 ? '' : (result.llmResult !== '' ? result.llmResult : (result.result !== '' ? result.result : '')),
                },
                quicklookurl: result.notFound === 1 ? '' : result.latestJson,
                ...(result.notFound !== 1  && {
                mods: {
                    alt: {
                        subtitle: 'View last JSON contents',
                            variables: {
                                theAction: 'viewLastJSON',
                            }
                    },
                    ...(result.result !== '' && {
                        cmd: {
                            subtitle: 'View last result',
                            variables: {
                                theAction: 'viewLastResult',
                            }
                        }
                    })
                }
                })
            });
        }
    } else if (theAction === 'selectMode') {
        const newModes = getModes();
        if (newModes.length > 0) {
            items.push(...newModes.map(mode => ({
                uid: mode.key,
                type: 'default',
                autocomplete: mode.name,
                title: mode.name,
                autocomplete: mode.name,
                subtitle: `↩ Activate • ⌘↩ Activate and Record • ⌘C Copy Deep Link`,
                text: {
                    'copy': `superwhisper://mode?key=${encodeURIComponent(mode.key)}`,
                },
                quicklookurl: mode.filePath,
                variables: { theAction: 'openMode', theUrl: `superwhisper://mode?key=${encodeURIComponent(mode.key)}`, modeName: mode.name },
                mods: {
                    cmd: {
                        subtitle: 'Activate and Record',
                        variables: {
                            theAction: 'openModeRecord',
                            theUrl: `superwhisper://mode?key=${encodeURIComponent(mode.key)}`
                        }
                    }}
            })));
        }
        if (showSM === '1'){
            items.push({
                uid: 'smode',
                type: 'default',
                autocomplete:'Super Mode',
                title: `Super Mode`,
                subtitle: `↩ Activate • ⌘↩ Activate and Record • ⌘C Copy DeepLink`,
                variables: { theAction: 'activateSuperM' },
                text: {
                    'copy': `activateRecordSuperM`,
                },
                mods: {
                    cmd: {
                        subtitle: 'Activate and Record',
                        variables: {
                            theAction: 'activateRecordSuperM'
                        }
                    }}
            });
        }
        if (items.length === 0) {
            items.push({
                uid: 'noModes',
                valid: false,
                type: 'default',
                title: `No Modes Found`,
                arg: ''
            });
        }
    }

    return JSON.stringify({ items: items });
}