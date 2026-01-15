// Excel表格数据校验工具
// 用于校验表61学生缺勤数据的格式和规范

// 全局变量
let excelData = []; // 存储读取的Excel数据
let validationResults = { // 存储校验结果
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
});

/**
 * 初始化事件监听器
 */
function initializeEventListeners() {
    // 文件上传事件
    const fileInput = document.getElementById('file-input');
    const dropArea = document.getElementById('drop-area');
    const validateBtn = document.getElementById('validate-btn');
    const downloadBtn = document.getElementById('download-btn');
    const clearBtn = document.getElementById('clear-btn');

    // 文件选择事件
    fileInput.addEventListener('change', handleFileSelect);

    // 拖放事件
    dropArea.addEventListener('dragover', handleDragOver);
    dropArea.addEventListener('dragleave', handleDragLeave);
    dropArea.addEventListener('drop', handleDrop);

    // 按钮事件
    validateBtn.addEventListener('click', validateData);
    downloadBtn.addEventListener('click', downloadResults);
    clearBtn.addEventListener('click', clearAllData);
}

/**
 * 处理文件选择
 * @param {Event} event - 文件选择事件
 */
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        processFile(file);
    }
}

/**
 * 处理拖放区域的dragover事件
 * @param {Event} event - 拖放事件
 */
function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('dragover');
}

/**
 * 处理拖放区域的dragleave事件
 * @param {Event} event - 拖放事件
 */
function handleDragLeave(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
}

/**
 * 处理拖放区域的drop事件
 * @param {Event} event - 拖放事件
 */
function handleDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
    
    const file = event.dataTransfer.files[0];
    if (file) {
        processFile(file);
    }
}

/**
 * 处理上传的文件
 * @param {File} file - 上传的Excel文件
 */
function processFile(file) {
    // 验证文件类型
    if (!file.name.match(/\.(xlsx|xls)$/)) {
        showError('请选择Excel文件(.xlsx或.xls格式)');
        return;
    }

    // 显示加载状态
    showLoading();

    // 读取文件
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            // 使用xlsx.js解析Excel文件
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // 调试：打印所有工作表名称
            console.log('Excel文件中的所有工作表:', workbook.SheetNames);
            
            // 优先读取"数据列表"工作表
            let worksheet;
            const dataSheetName = workbook.SheetNames.find(name => 
                name.includes('数据列表') || name === 'Sheet1' || name === 'Data'
            );
            
            if (dataSheetName) {
                console.log('选择的工作表:', dataSheetName);
                worksheet = workbook.Sheets[dataSheetName];
            } else {
                // 如果没有找到指定名称的工作表，使用第一个工作表
                console.log('未找到数据列表工作表，使用第一个工作表');
                worksheet = workbook.Sheets[workbook.SheetNames[0]];
            }
            
            // 获取工作表范围
            const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
            console.log('工作表范围:', worksheet['!ref']);
            console.log('起始行:', range.s.r, '起始列:', range.s.c);
            console.log('结束行:', range.e.r, '结束列:', range.e.c);
            
            // 转换为JSON格式，先获取所有行
            const allRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
            console.log('总行数（含表头）:', allRows.length);
            
            // 过滤掉空行和只有部分数据的行
            const filteredRows = allRows.filter(row => {
                // 至少有1个非空单元格
                return row.some(cell => cell !== '' && cell !== null && cell !== undefined);
            });
            
            console.log('过滤后的行数:', filteredRows.length);
            
            if (filteredRows.length === 0) {
                hideLoading();
                showError('Excel文件中没有有效数据');
                return;
            }
            
            // 第一行作为表头
            const headers = filteredRows[0].map(h => String(h).trim());
            console.log('表头:', headers);
            console.log('表头列数:', headers.length);
            
            // 数据行（从第二行开始）
            const dataRows = filteredRows.slice(1);
            console.log('数据行数:', dataRows.length);
            
            // 转换为对象数组
            excelData = dataRows.map((row, rowIndex) => {
                const obj = {};
                headers.forEach((header, colIndex) => {
                    if (header && colIndex < row.length) {
                        obj[header] = row[colIndex];
                    }
                });
                obj['_rowIndex'] = rowIndex + 2; // 记录原始行号（+2因为过滤后从0开始，且第一行是表头）
                return obj;
            });
            
            // 过滤掉空数据行（所有字段都为空）
            excelData = excelData.filter(row => {
                const keys = Object.keys(row).filter(k => !k.startsWith('_'));
                return keys.some(k => row[k] !== '' && row[k] !== null && row[k] !== undefined);
            });
            
            console.log('最终数据行数:', excelData.length);
            
            // 隐藏加载状态
            hideLoading();
            
            // 显示文件信息
            showFileInfo(file);
            
            // 显示数据预览
            displayDataPreview();
            
            // 启用校验按钮
            document.getElementById('validate-btn').disabled = false;
            
        } catch (error) {
            hideLoading();
            showError('解析Excel文件失败: ' + error.message);
            console.error('解析错误:', error);
        }
    };
    
    reader.onerror = function() {
        hideLoading();
        showError('读取文件失败');
    };
    
    reader.readAsArrayBuffer(file);
}

/**
 * 显示文件信息
 * @param {File} file - 上传的文件
 */
function showFileInfo(file) {
    const fileInfo = document.getElementById('file-info');
    fileInfo.innerHTML = `
        <strong>文件名:</strong> ${file.name}<br>
        <strong>文件大小:</strong> ${(file.size / 1024).toFixed(2)} KB<br>
        <strong>修改时间:</strong> ${new Date(file.lastModified).toLocaleString()}
    `;
    fileInfo.classList.add('show');
}

/**
 * 显示数据预览
 */
function displayDataPreview() {
    const table = document.getElementById('data-table');
    
    if (excelData.length === 0) {
        table.innerHTML = '<tr><td colspan="100%" style="text-align: center; color: #718096; padding: 30px;">暂无数据</td></tr>';
        return;
    }
    
    // 获取表头
    const headers = Object.keys(excelData[0]);
    
    // 生成表头行
    let html = '<thead><tr>';
    headers.forEach(header => {
        html += `<th>${header}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    // 生成数据行（最多显示10行）
    const displayData = excelData.slice(0, 10);
    displayData.forEach(row => {
        html += '<tr>';
        headers.forEach(header => {
            html += `<td>${row[header] || ''}</td>`;
        });
        html += '</tr>';
    });
    
    html += '</tbody>';
    table.innerHTML = html;
    
    // 如果数据超过10行，显示提示
    if (excelData.length > 10) {
        const tableContainer = table.parentElement;
        const moreInfo = document.createElement('div');
        moreInfo.innerHTML = `<p style="text-align: center; color: #718096; margin: 10px 0;">显示前10行，共 ${excelData.length} 行数据</p>`;
        tableContainer.appendChild(moreInfo);
    }
}

/**
 * 验证数据
 */
function validateData() {
    if (excelData.length === 0) {
        showError('请先上传Excel文件');
        return;
    }
    
    // 显示加载状态
    showLoading();
    
    // 重置校验结果
    validationResults = {
        total: excelData.length,
        passed: 0,
        failed: 0,
        errors: []
    };
    
    // 延迟执行，让加载动画显示
    setTimeout(() => {
        // 遍历每条数据进行校验
        excelData.forEach((row, index) => {
            const errors = validateRow(row, index + 1);
            
            if (errors.length > 0) {
                validationResults.failed++;
                validationResults.errors.push(...errors);
            } else {
                validationResults.passed++;
            }
        });
        
        // 隐藏加载状态
        hideLoading();
        
        // 显示校验结果
        displayValidationResults();
        
        // 启用下载按钮
        document.getElementById('download-btn').disabled = false;
        
    }, 500);
}

/**
 * 验证单行数据
 * @param {Object} row - 数据行
 * @param {number} rowIndex - 行索引
 * @returns {Array} - 错误信息数组
 */
function validateRow(row, rowIndex) {
    const errors = [];
    const studentId = row['XH-学号'] || row['学号'] || '未知';
    
    // 辅助函数：获取值的详细信息
    function getValueInfo(value) {
        return {
            value: value,
            type: typeof value,
            constructor: value.constructor.name,
            string: String(value),
            length: String(value).length
        };
    }
    
    // 辅助函数：更灵活的字段获取，支持多种表头名称
    function getFieldValue(row, fieldNames) {
        for (const name of fieldNames) {
            if (row.hasOwnProperty(name)) {
                return row[name];
            }
        }
        // 尝试匹配包含关键字的字段名
        for (const key in row) {
            const lowercaseKey = key.toLowerCase();
            for (const name of fieldNames) {
                const lowercaseName = name.toLowerCase();
                if (lowercaseKey.includes(lowercaseName.replace(/[-]/g, ''))) {
                    return row[key];
                }
            }
        }
        return '';
    }
    
    // 添加调试信息：显示当前行的所有字段名和值
    console.log(`=== 第${rowIndex}行数据调试信息 ===`);
    console.log('所有字段名:', Object.keys(row));
    console.log('整行数据:', row);
    
    // 1. 检查学号
    const xhValue = getFieldValue(row, ['XH-学号', '学号', 'XH', 'xh', 'studentId', 'StudentId']);
    console.log('获取到的学号:', xhValue);
    if (xhValue === '' || xhValue === null || xhValue === undefined) {
        const info = getValueInfo(xhValue);
        errors.push({
            studentId: studentId,
            reason: `学号不能为空（实际值：${JSON.stringify(info.value)}，类型：${info.type}(${info.constructor})）`,
            rowIndex: rowIndex
        });
    } else if (!validateStudentId(xhValue)) {
        const info = getValueInfo(xhValue);
        errors.push({
            studentId: studentId,
            reason: `学号格式不符合要求（实际值：${JSON.stringify(info.value)}，类型：${info.type}(${info.constructor})，要求：字符串，长度5-20）`,
            rowIndex: rowIndex
        });
    }
    
    // 2. 检查缺勤日期
    const qqrq = getFieldValue(row, ['QQRQ-缺勤日期', '缺勤日期', 'QQRQ', 'qqrq', '缺勤时间', '缺勤日期时间']);
    console.log('获取到的缺勤日期:', qqrq, '类型:', typeof qqrq);
    if (qqrq === '' || qqrq === null || qqrq === undefined) {
        const info = getValueInfo(qqrq);
        errors.push({
            studentId: studentId,
            reason: `缺勤日期不能为空（实际值：${JSON.stringify(info.value)}，类型：${info.type}(${info.constructor})，所有字段：${JSON.stringify(Object.keys(row))}）`,
            rowIndex: rowIndex
        });
    } else if (!validateDateFormat(qqrq)) {
        const info = getValueInfo(qqrq);
        errors.push({
            studentId: studentId,
            reason: `缺勤日期格式不符合要求（实际值：${JSON.stringify(info.value)}，类型：${info.type}(${info.constructor})，字符串表示："${info.string}"，要求：YYYYMMDD格式的8位数字）`,
            rowIndex: rowIndex
        });
    }
    
    // 3. 检查审批时间
    const spsj = getFieldValue(row, ['SPSJ-审批时间', '审批时间', 'SPSJ', 'spsj', '审批日期', '审批日期时间']);
    console.log('获取到的审批时间:', spsj, '类型:', typeof spsj);
    if (spsj === '' || spsj === null || spsj === undefined) {
        const info = getValueInfo(spsj);
        errors.push({
            studentId: studentId,
            reason: `审批时间不能为空（实际值：${JSON.stringify(info.value)}，类型：${info.type}(${info.constructor})）`,
            rowIndex: rowIndex
        });
    } else if (!validateDateFormat(spsj)) {
        const info = getValueInfo(spsj);
        errors.push({
            studentId: studentId,
            reason: `审批时间格式不符合要求（实际值：${JSON.stringify(info.value)}，类型：${info.type}(${info.constructor})，字符串表示："${info.string}"，要求：YYYYMMDD格式的8位数字）`,
            rowIndex: rowIndex
        });
    } else if (qqrq !== '' && validateDateFormat(qqrq) && !validateDateConsistency(qqrq, spsj)) {
        // 4. 检查缺勤时间与审批时间一致性（只有当缺勤日期有效时才检查）
        const qqrqInfo = getValueInfo(qqrq);
        const spsjInfo = getValueInfo(spsj);
        errors.push({
            studentId: studentId,
            reason: `缺勤时间与审批时间不一致（缺勤日期：${JSON.stringify(qqrqInfo.value)}，审批时间：${JSON.stringify(spsjInfo.value)}，要求：审批时间必须与缺勤日期相同）`,
            rowIndex: rowIndex
        });
    }
    
    // 5. 检查开课学期码（必须从下拉选项中选择）
    const kkxqm = getFieldValue(row, ['KKXQM-开课学期码', '开课学期码', 'KKXQM', 'kkxqm', '学期码', '开课学期']);
    console.log('获取到的开课学期码:', kkxqm, '类型:', typeof kkxqm);
    if (kkxqm === '' || kkxqm === null || kkxqm === undefined) {
        const info = getValueInfo(kkxqm);
        errors.push({
            studentId: studentId,
            reason: `开课学期码不能为空（实际值：${JSON.stringify(info.value)}，类型：${info.type}(${info.constructor})）`,
            rowIndex: rowIndex
        });
    } else if (!validateSemesterCode(kkxqm)) {
        const info = getValueInfo(kkxqm);
        errors.push({
            studentId: studentId,
            reason: `开课学期码必须从下拉选项中选择（实际值：${JSON.stringify(info.value)}，类型：${info.type}(${info.constructor})，要求：只能是1-秋季学期, 2-春季学期, 3-夏季学期, 9-其他）`,
            rowIndex: rowIndex
        });
    }
    
    // 6. 检查缺勤类型（必须从下拉选项中选择）
    const qqlx = getFieldValue(row, ['QQLX-缺勤类型', '缺勤类型', 'QQLX', 'qqlx', '缺勤种类', '缺勤类别']);
    console.log('获取到的缺勤类型:', qqlx, '类型:', typeof qqlx);
    if (qqlx === '' || qqlx === null || qqlx === undefined) {
        const info = getValueInfo(qqlx);
        errors.push({
            studentId: studentId,
            reason: `缺勤类型不能为空（实际值：${JSON.stringify(info.value)}，类型：${info.type}(${info.constructor})）`,
            rowIndex: rowIndex
        });
    } else if (!validateAbsenceType(qqlx)) {
        const info = getValueInfo(qqlx);
        errors.push({
            studentId: studentId,
            reason: `缺勤类型必须从下拉选项中选择（实际值：${JSON.stringify(info.value)}，类型：${info.type}(${info.constructor})，要求：只能是1-病假, 2-事假, 3-迟到早退, 4-旷课）`,
            rowIndex: rowIndex
        });
    }
    
    // 7. 检查考勤类型（必须从下拉选项中选择）
    const kqlx = getFieldValue(row, ['KQLX-考勤类型', '考勤类型', 'KQLX', 'kqlx', '考勤方式', '考勤种类']);
    console.log('获取到的考勤类型:', kqlx, '类型:', typeof kqlx);
    if (kqlx === '' || kqlx === null || kqlx === undefined) {
        const info = getValueInfo(kqlx);
        errors.push({
            studentId: studentId,
            reason: `考勤类型不能为空（实际值：${JSON.stringify(info.value)}，类型：${info.type}(${info.constructor})）`,
            rowIndex: rowIndex
        });
    } else if (!validateAttendanceType(kqlx)) {
        const info = getValueInfo(kqlx);
        errors.push({
            studentId: studentId,
            reason: `考勤类型必须从下拉选项中选择（实际值：${JSON.stringify(info.value)}，类型：${info.type}(${info.constructor})，要求：只能是1-点名考勤, 2-签到考勤, 3-课堂互动考勤, 4-抽查考勤, 5-综合考勤, 9-其他）`,
            rowIndex: rowIndex
        });
    }
    
    return errors;
}

/**
 * 验证学号格式
 * @param {string|number} studentId - 学号
 * @returns {boolean} - 是否有效
 */
function validateStudentId(studentId) {
    // 处理Excel文本格式，将数字转换为字符串
    const studentIdStr = String(studentId);
    // 学号长度在5-20之间
    return studentIdStr.length >= 5 && studentIdStr.length <= 20;
}

/**
 * 验证日期格式（YYYYMMDD）
 * @param {string|number|Date} date - 日期，可以是字符串、数字或Date对象
 * @returns {boolean} - 是否有效
 */
function validateDateFormat(date) {
    let dateStr;
    
    // 处理Date对象
    if (date instanceof Date) {
        // 将Date对象转换为YYYYMMDD格式
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        dateStr = `${year}${month}${day}`;
    } 
    // 处理数字（可能是Excel数字日期格式）
    else if (typeof date === 'number') {
        // 检查是否为Excel数字日期（从1900年1月1日开始的天数）
        if (date > 0 && date < 700000) {
            // 将Excel数字日期转换为Date对象
            const excelDate = new Date((date - 25569) * 86400 * 1000);
            const year = excelDate.getFullYear();
            const month = String(excelDate.getMonth() + 1).padStart(2, '0');
            const day = String(excelDate.getDate()).padStart(2, '0');
            dateStr = `${year}${month}${day}`;
        } else {
            // 普通数字，直接转换为字符串
            dateStr = String(date);
        }
    }
    // 处理字符串
    else {
        dateStr = String(date);
    }
    
    // 只检查格式是否为8位数字，不验证日期的有效性
    return /^\d{8}$/.test(dateStr);
}

/**
 * 验证缺勤时间与审批时间一致性
 * @param {string|number|Date} qqrq - 缺勤日期
 * @param {string|number|Date} spsj - 审批时间
 * @returns {boolean} - 是否一致
 */
function validateDateConsistency(qqrq, spsj) {
    // 辅助函数：将任意日期格式转换为YYYYMMDD字符串
    function toYYYYMMDD(date) {
        let dateStr;
        
        if (date instanceof Date) {
            // Date对象转换为YYYYMMDD
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            dateStr = `${year}${month}${day}`;
        } else if (typeof date === 'number') {
            // 数字处理
            if (date > 0 && date < 700000) {
                // Excel数字日期转换
                const excelDate = new Date((date - 25569) * 86400 * 1000);
                const year = excelDate.getFullYear();
                const month = String(excelDate.getMonth() + 1).padStart(2, '0');
                const day = String(excelDate.getDate()).padStart(2, '0');
                dateStr = `${year}${month}${day}`;
            } else {
                // 普通数字转换为字符串
                dateStr = String(date).substr(0, 8);
            }
        } else {
            // 字符串直接取前8位
            dateStr = String(date).substr(0, 8);
        }
        
        return dateStr;
    }
    
    // 比较两个日期的YYYYMMDD格式是否相同
    return toYYYYMMDD(qqrq) === toYYYYMMDD(spsj);
}

/**
 * 验证开课学期码（支持格式：1, 1-秋季学期）
 * @param {string|number} code - 学期码
 * @returns {boolean} - 是否有效
 */
function validateSemesterCode(code) {
    const codeStr = String(code).trim();
    // 下拉选项格式：1-秋季学期, 2-春季学期, 3-夏季学期, 9-其他
    // 支持纯数字或"代码-名称"格式
    const validCodes = ['1', '2', '3', '9'];
    const validPatterns = ['1-秋季学期', '2-春季学期', '3-夏季学期', '9-其他'];
    return validCodes.includes(codeStr) || validPatterns.includes(codeStr);
}

/**
 * 验证缺勤类型（支持格式：1, 1-病假）
 * @param {string|number} type - 缺勤类型
 * @returns {boolean} - 是否有效
 */
function validateAbsenceType(type) {
    const typeStr = String(type).trim();
    // 下拉选项格式：1-病假, 2-事假, 3-迟到早退, 4-旷课
    // 支持纯数字或"代码-名称"格式
    const validTypes = ['1', '2', '3', '4'];
    const validPatterns = ['1-病假', '2-事假', '3-迟到早退', '4-旷课'];
    return validTypes.includes(typeStr) || validPatterns.includes(typeStr);
}

/**
 * 验证考勤类型（支持格式：1, 1-点名考勤）
 * @param {string|number} type - 考勤类型
 * @returns {boolean} - 是否有效
 */
function validateAttendanceType(type) {
    const typeStr = String(type).trim();
    // 下拉选项格式：1-点名考勤, 2-签到考勤, 3-课堂互动考勤, 4-抽查考勤, 5-综合考勤, 9-其他
    // 支持纯数字或"代码-名称"格式
    const validTypes = ['1', '2', '3', '4', '5', '9'];
    const validPatterns = ['1-点名考勤', '2-签到考勤', '3-课堂互动考勤', '4-抽查考勤', '5-综合考勤', '9-其他'];
    return validTypes.includes(typeStr) || validPatterns.includes(typeStr);
}

/**
 * 显示校验结果
 */
function displayValidationResults() {
    // 更新统计信息
    document.getElementById('total-count').textContent = validationResults.total;
    document.getElementById('pass-count').textContent = validationResults.passed;
    document.getElementById('fail-count').textContent = validationResults.failed;
    
    // 显示错误列表
    const errorsList = document.getElementById('errors-list');
    
    if (validationResults.errors.length === 0) {
        errorsList.innerHTML = '<p style="text-align: center; color: #48bb78; padding: 30px;">所有数据均符合要求！</p>';
        return;
    }
    
    // 生成错误列表
    let html = '';
    validationResults.errors.forEach(error => {
        html += `
            <div class="error-item">
                <span class="student-id">${error.studentId}</span>
                <span class="error-reason">- ${error.reason}（行：${error.rowIndex}）</span>
            </div>
        `;
    });
    
    errorsList.innerHTML = html;
}

/**
 * 下载校验结果
 */
function downloadResults() {
    if (validationResults.errors.length === 0) {
        showError('没有错误数据需要下载');
        return;
    }
    
    // 生成TXT内容
    let content = 'Excel表格数据校验结果\n';
    content += '=' .repeat(50) + '\n';
    content += `总记录数: ${validationResults.total}\n`;
    content += `通过校验: ${validationResults.passed}\n`;
    content += `未通过校验: ${validationResults.failed}\n`;
    content += '=' .repeat(50) + '\n';
    content += '不符合要求的数据：\n\n';
    
    validationResults.errors.forEach(error => {
        content += `${error.studentId}-${error.reason}\n`;
    });
    
    // 创建下载链接
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `excel_validation_result_${new Date().getTime()}.txt`;
    
    // 触发下载
    document.body.appendChild(a);
    a.click();
    
    // 清理
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

/**
 * 清空所有数据
 */
function clearAllData() {
    // 重置全局变量
    excelData = [];
    validationResults = {
        total: 0,
        passed: 0,
        failed: 0,
        errors: []
    };
    
    // 重置UI
    document.getElementById('file-input').value = '';
    document.getElementById('file-info').innerHTML = '';
    document.getElementById('file-info').classList.remove('show');
    document.getElementById('data-table').innerHTML = '<tr><td colspan="100%" style="text-align: center; color: #718096; padding: 30px;">暂无数据</td></tr>';
    document.getElementById('total-count').textContent = '0';
    document.getElementById('pass-count').textContent = '0';
    document.getElementById('fail-count').textContent = '0';
    document.getElementById('errors-list').innerHTML = '';
    
    // 禁用按钮
    document.getElementById('validate-btn').disabled = true;
    document.getElementById('download-btn').disabled = true;
}

/**
 * 显示加载状态
 */
function showLoading() {
    document.getElementById('loading').classList.add('show');
}

/**
 * 隐藏加载状态
 */
function hideLoading() {
    document.getElementById('loading').classList.remove('show');
}

/**
 * 显示错误信息
 * @param {string} message - 错误信息
 */
function showError(message) {
    alert(message);
}

// 测试相关函数（用于单元测试）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateStudentId,
        validateDateFormat,
        validateDateConsistency,
        validateSemesterCode,
        validateAbsenceType,
        validateAttendanceType
    };
}
