async function fetchModelResponse(number) {
    const model = document.getElementById('modelInput').value || 'qwen-plus';
    const system = document.getElementById('systemInput').value || 'You are a helpful assistant.';
    const api_key = document.getElementById('api_key').value;

    const toggleSwitch = document.getElementById('toggle-switch');
    console.log(toggleSwitch);

    
    try {
        const startTime = Date.now(); // 记录请求开始时间
        const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${api_key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: system
                    },
                    {
                        role: 'user',
                        content: `${number}`
                    }
                ],
                temperature: 0.7,
                top_p: 0.8,
                extra_body: {"enable_search": toggleSwitch}
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const endTime = Date.now(); // 记录请求结束时间
        const time_consuming = (endTime - startTime) / 1000; // 计算请求耗时并转换为秒
        return {
            content: data.choices[0].message.content,
            prompt_tokens: data.usage.prompt_tokens,
            completion_tokens: data.usage.completion_tokens,
            cachedtokens: data.usage.prompt_tokens_details?.cached_tokens || 0, // 假设cachedtokens可能不存在，默认值为0
            time_consuming: time_consuming.toFixed(3) // 添加耗时信息
        };
    } catch (error) {
        console.error('Error fetching model response:', error);
        return {
            content: `error: ${error.message}`,
            prompt_tokens: 0,
            completion_tokens: 0,
            cachedtokens: 0,
            time_consuming: '0.000'
        };
    }
}

async function convertNumbersToWords(data) {
    const convertedData = [];
    const total = data.length;
    for (let i = 0; i < total; i++) {
        const row = data[i];
        if (row.user) {
            try {
                const response = await fetchModelResponse(row.user);
                convertedData.push({
                    ...row,
                    converted: response.content,
                    prompt_tokens: response.prompt_tokens,
                    completion_tokens: response.completion_tokens,
                    cachedtokens: response.cachedtokens,
                    time_consuming: response.time_consuming // 添加耗时信息
                });
            } catch (error) {
                console.error('Error converting number to word:', error);
                convertedData.push({
                    ...row,
                    converted: `error: ${error.message}`,
                    prompt_tokens: 0,
                    completion_tokens: 0,
                    cachedtokens: 0,
                    time_consuming: '0.000' // 添加耗时信息，默认值为0
                });
            }
        } else {
            convertedData.push(row);
        }
        updateProgress(((i + 1) / total) * 100, i + 1, total);
    }
    return convertedData;
}

document.getElementById('fileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        // Store the parsed data for later use
        window.parsedData = json;
    };
    reader.readAsArrayBuffer(file);
});

document.getElementById('startBtn').addEventListener('click', async function() {
    const file = document.getElementById('fileInput').files[0];
    if (!file) return;

    if (!window.parsedData) {
        alert('请先上传文件');
        return;
    }

    // Show progress bar
    const progressBar = document.getElementById('progressBar');
    progressBar.style.display = 'block';

    // Convert data and update progress
    const convertedData = await convertNumbersToWords(window.parsedData);
    updateProgress(100);

    // Create new workbook with original and converted data
    const newWorksheet = XLSX.utils.json_to_sheet(convertedData);
    const newWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Converted Data');

    // Save file
    XLSX.writeFile(newWorkbook, 'converted_data.xlsx');

    
});

function generateSampleExcel() {
    const data = [
        { user: '数据1' },
        { user: '数据2' },
        { user: '数据3' }
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sample Data');
    XLSX.writeFile(workbook, 'sample_data.xlsx');
}

document.getElementById('downloadBtn').addEventListener('click', function() {
    generateSampleExcel();
});

function updateProgress(percentage, current, total) {
    const progressBar = document.getElementById('progressBar');
    const progress = document.getElementById('progress');
    progress.style.width = `${percentage}%`;
    progressBar.setAttribute('data-progress', `处理中: ${current}/${total}`);
}


