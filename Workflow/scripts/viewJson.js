function run(argv) {
    const jsonPath = argv[0];
    
    function processJson(filePath) {
        const fileManager = $.NSFileManager.defaultManager;
        
        if (fileManager.fileExistsAtPath($(filePath))) {
            let fileContent;
            try {
                fileContent = $.NSString.stringWithContentsOfFileEncodingError($(filePath), $.NSUTF8StringEncoding, $());
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
                    const datetimeObj = new Date(jsonContent.datetime + 'Z');
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
                
                // Create formatted string
                const desiredOrder = ['prompt', 'rawResult', 'result', 'llmResult'];
                let formattedString = '';
                const entries = Object.entries(jsonContent);

                for (const key of desiredOrder) {
                    if (key in jsonContent) {
                        const value = jsonContent[key];
                        formattedString += `## ${key}\n${value !== undefined && value !== null ? value : 'N/A'}\n---\n`;
                    }
                }

                entries
                    .filter(([key]) => !desiredOrder.includes(key) && key !== 'segments' && key !== 'datetime' && key !== 'appVersion')
                    .sort(([a], [b]) => a.localeCompare(b))
                    .forEach(([key, value]) => {
                        // Convert milliseconds to seconds for specific keys
                        if (['duration', 'processingTime', 'languageModelProcessingTime'].includes(key) && value !== undefined && value !== null) {
                            const seconds = (value / 1000).toFixed(2);
                            formattedString += `## ${key}\n\`${seconds}s\`\n---\n`;
                        } else {
                            formattedString += `## ${key}\n${value !== undefined && value !== null ? value : 'N/A'}\n---\n`;
                        }
                });
                
                return {
                    latestJson: filePath,
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

    const result = processJson(jsonPath);
    
    if (result.notFound) {
        return JSON.stringify({
            alfredworkflow: {
                variables: {
                    theAction: 'error',
                    theContent: 'Error processing JSON file'
                }
            }
        });
    }
    
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