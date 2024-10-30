ObjC.import('stdlib');
ObjC.import('Foundation');

function run(argv) {
    var query = argv[0];
    const swPath = $.getenv('swPath');
    const showSM = $.getenv('showSM');
    const showHistory = $.getenv('showHistory');
    const favModeA = $.getenv('favModeA');
    const favModeAName = $.getenv('favModeAName');
    const favModeB = $.getenv('favModeB');
    const favModeBName = $.getenv('favModeBName');
    const modesDir = swPath + '/modes';
    const recDir = swPath + '/recordings';
    const hisNumber = $.getenv('hisNumber');
    const fileManager = $.NSFileManager.defaultManager;
    
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

    function processMetaJsonFiles(mode = 'default') {
        const error = $();
        const results = [];
        
        // Get contents of the recDir
        const contents = fileManager.contentsOfDirectoryAtPathError($(recDir), error);
        
        if (error.code) {
            return [];
        }
        
        // Sort contents to get the latest folders
        const sortedContents = ObjC.unwrap(contents).sort((a, b) => {
            return ObjC.unwrap(b).localeCompare(ObjC.unwrap(a));
        });
    
        if (sortedContents.length === 0) {
            return [];
        }
    
        // If hisNumber is 0, check all folders, otherwise check specified number
        const foldersToCheck = hisNumber === '0' ? 
            sortedContents.length : 
            Math.min(Number(hisNumber), sortedContents.length);
    
        for (let i = 0; i < foldersToCheck; i++) {
            const folder = ObjC.unwrap(sortedContents[i]);
            const metaJsonPath = recDir + '/' + folder + '/meta.json';
    
            if (fileManager.fileExistsAtPath($(metaJsonPath))) {
                let fileContent;
                try {
                    fileContent = $.NSString.stringWithContentsOfFileEncodingError($(metaJsonPath), $.NSUTF8StringEncoding, $());
                    if (!fileContent) continue;
                } catch (readError) {
                    continue;
                }
                
                try {
                    const jsonContent = JSON.parse(fileContent.js);
                    const llmResult = jsonContent.llmResult || '';
                    const simpleResult = jsonContent.result || '';
                    
                    // Skip if both results are empty
                    if (!llmResult && !simpleResult) continue;
    
                    // Format datetime
                    let formattedDate = '';
                    if (jsonContent.datetime) {
                        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                        const datetimeObj = new Date(jsonContent.datetime + 'Z');
                        if (!isNaN(datetimeObj.getTime())) {
                            const localDatetime = new Date(datetimeObj.toLocaleString("en-US", {timeZone: userTimezone}));
                            formattedDate = `${String(localDatetime.getMonth() + 1).padStart(2, '0')}/${String(localDatetime.getDate()).padStart(2, '0')} ${String(localDatetime.getHours() % 12 || 12).padStart(2, '0')}:${String(localDatetime.getMinutes()).padStart(2, '0')} ${localDatetime.getHours() >= 12 ? 'PM' : 'AM'} • `;
                        }
                    }
                    
                    // Build subtitle based on available content
                    let subtitle = formattedDate;
                    if (mode === 'voice') {
                        subtitle += '↩ View voice • ';
                        if (llmResult) {
                            subtitle += '⌘↩ View AI • ⌥↩ Copy voice & AI • ';
                        }
                        subtitle += '^↩ JSON';
                    } else {
                        if (llmResult) {
                            subtitle += '↩ View AI • ⌘↩ View voice • ⌥↩ Copy voice & AI • ';
                        } else {
                            subtitle += '↩ View voice • ';
                        }
                        subtitle += '^↩ JSON';
                    }
                    
                    results.push({
                        title: mode === 'voice' ? simpleResult : (llmResult || simpleResult),
                        subtitle: subtitle,
                        jsonPath: metaJsonPath,
                        llmResult: llmResult,
                        result: simpleResult
                    });
                    
                } catch (parseError) {
                    continue;
                }
            }
        }
        
        return results;
    }
    
    var items = [];

    if (theAction === '') {
        const result = processLatestMetaJson();
        items.push({
            uid: 'settings',
            type: 'default',
            title: 'Settings',
            autocomplete: 'Settings',
            arg: result.latestJson,
            subtitle: '↩ Open SuperWhisper settings • ⌘↩ Open workflow settings',
            text: {
                    'copy': result.notFound === 1 ? '' : (result.llmResult !== '' ? result.llmResult : (result.result !== '' ? result.result : '')),
                    'largetype': result.notFound === 1 ? '' : ((result.llmResult || result.result).length > 1300 
                ? (result.llmResult || result.result).substring(0, 1300) + '...' 
                : (result.llmResult || result.result))
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
            arg: result.latestJson,
            subtitle: '↩ Choose Mode • ⌘↩ Reveal in Finder',
            text: {
                'copy': result.notFound === 1 ? '' : (result.llmResult !== '' ? result.llmResult : (result.result !== '' ? result.result : '')),
                'largetype': result.notFound === 1 ? '' : ((result.llmResult || result.result).length > 1300 
            ? (result.llmResult || result.result).substring(0, 1300) + '...' 
            : (result.llmResult || result.result))
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
            arg: result.latestJson,
            subtitle: '↩ Toggle recording' + (favModeA !== '' ? ' • ⌘↩ Record in "' + favModeAName + '"': '') + (favModeB !== '' ? ' • ⌥↩ Record in "' + favModeBName + '"': ''),
            text: {
                'copy': result.notFound === 1 ? '' : (result.llmResult !== '' ? result.llmResult : (result.result !== '' ? result.result : '')),
                'largetype': result.notFound === 1 ? '' : ((result.llmResult || result.result).length > 1300 
            ? (result.llmResult || result.result).substring(0, 1300) + '...' 
            : (result.llmResult || result.result))
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

        if (result.notFound !== 1) {
            items.push({
                uid: 'history',
                type: 'default',
                title: 'History',
                arg: result.latestJson,
                autocomplete: 'History',
                subtitle: `↩ Filter by result • ⌘↩ Filter by voice • ⌥↩ Last result • ⌃↩ Last JSON ${showHistory === '1' ? '• ⇧↩ History in SW' : ''}`,
                variables: { theAction: 'selectHistoryResult' },
                text: {
                    'copy': result.notFound === 1 ? '' : (result.llmResult !== '' ? result.llmResult : (result.result !== '' ? result.result : '')),
                    'largetype': result.notFound === 1 ? '' : ((result.llmResult || result.result).length > 1300 
                ? (result.llmResult || result.result).substring(0, 1300) + '...' 
                : (result.llmResult || result.result))
                },
                quicklookurl: result.latestJson,
                mods: {
                    cmd: {
                        subtitle: 'Filter by voice',
                        variables: {
                            theAction: 'selectHistoryVoice',
                        }
                    },
                    ctrl: {
                        subtitle: 'View last JSON contents',
                        variables: {
                            theAction: 'viewLastJSON',
                        }
                    },
                    alt: {
                        subtitle: 'View last result',
                        variables: {
                            theAction: 'viewLastResult',
                        }
                    },
                    ...(showHistory === '1' ? {
                        shift: {
                            subtitle: 'View history in SW',
                            variables: {
                                theAction: 'history'
                            }
                        }
                    } : {})
                }
            });
        }
    } else if (theAction === 'selectMode') {
        const newModes = getModes();
        if (newModes.length > 0) {
            items.push(...newModes.map(mode => ({
                uid: mode.key,
                type: 'file',
                autocomplete: mode.name,
                title: mode.name,
                autocomplete: mode.name,
                subtitle: `↩ Activate • ⌘↩ Activate and record • ⌘C Copy deep link`,
                text: {
                    'copy': `superwhisper://mode?key=${encodeURIComponent(mode.key)}`,
                },
                arg: mode.filePath,
                quicklookurl: mode.filePath,
                variables: { theAction: 'openMode', theUrl: `superwhisper://mode?key=${encodeURIComponent(mode.key)}`, modeName: mode.name },
                mods: {
                    cmd: {
                        subtitle: 'Activate and record',
                        variables: {
                            theAction: 'openModeRecord',
                            theUrl: `superwhisper://mode?key=${encodeURIComponent(mode.key)}`
                        }
                    }
                }
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
                valid: false,
                type: 'default',
                title: `No Modes Found`,
                arg: ''
            });
        }
    } else if (theAction === 'selectHistoryResult') {
        const historyItems = processMetaJsonFiles('default');
        historyItems.forEach(item => {
            items.push({
                type: 'file',
                title: item.title,
                autocomplete: item.title,
                subtitle: item.subtitle,
                arg: item.jsonPath,
                variables: { theAction: 'viewResult', theUrl: item.jsonPath },
                text: {
                    'copy': item.llmResult || item.result,
                    'largetype': (item.llmResult || item.result).length > 1300 
                    ? (item.llmResult || item.result).substring(0, 1300) + '...' 
                    : (item.llmResult || item.result)
                },
                quicklookurl: item.jsonPath,
                mods: {
                    cmd: {
                        subtitle: 'View voice',
                        variables: {
                            theAction: 'viewVoice',
                            theUrl: item.jsonPath
                        }
                    },
                    ctrl: {
                        subtitle: 'View JSON',
                        variables: {
                            theAction: 'viewJSON',
                            theUrl: item.jsonPath
                        }
                    },
                    'cmd + alt': {
                        subtitle: 'Copy system, voice & AI',
                        variables: {
                            theAction: 'copyLongChat',
                            theUrl: item.jsonPath
                        }
                    },
                    ...(item.llmResult !== '' ? {
                        alt: {
                            subtitle: 'Copy voice & AI',
                            variables: {
                                theAction: 'copyChat',
                                theUrl: item.jsonPath
                            }
                        }
                    } : {})
                }
            });
        });
        if (historyItems.length === 0) {
            items.push({
                type: 'default',
                title: 'No History Items Found',
                arg: '',
                valid: false
            });
        }
    } else if (theAction === 'selectHistoryVoice') {
        const historyItems = processMetaJsonFiles('voice');
        historyItems.forEach(item => {
            items.push({
                type: 'file',
                title: item.title,
                autocomplete: item.title,
                subtitle: item.subtitle,
                arg: item.jsonPath,
                variables: { theAction: 'viewVoice', theUrl: item.jsonPath },
                text: {
                    'copy': item.result,
                    'largetype': item.result.length > 1300 
                    ? item.result.substring(0, 1300) + '...' 
                    : item.result
                },
                quicklookurl: item.jsonPath,
                mods: {
                    cmd: {
                        subtitle: 'View AI',
                        variables: {
                            theAction: 'viewResult',
                            theUrl: item.jsonPath
                        }
                    },
                    ctrl: {
                        subtitle: 'View JSON',
                        variables: {
                            theAction: 'viewJSON',
                            theUrl: item.jsonPath
                        }
                    },
                    'cmd + alt': {
                        subtitle: 'Copy system, voice & AI',
                        variables: {
                            theAction: 'copyLongChat',
                            theUrl: item.jsonPath
                        }
                    },
                    ...(item.llmResult !== '' ? {
                        alt: {
                            subtitle: 'Copy voice & AI',
                            variables: {
                                theAction: 'copyChat',
                                theUrl: item.jsonPath
                            }
                        }
                    } : {})
                }
            });
        });
    }

    return JSON.stringify({ items: items });
}