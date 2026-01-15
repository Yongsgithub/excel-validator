@echo off
chcp 65001 >nul
cls
REM Excel数据校验工具 - GitHub Pages部署脚本

echo.
echo ===========================================
echo    Excel数据校验工具 - GitHub Pages部署
echo ===========================================
echo.

REM 检查Git
echo [1/6] 检查Git...
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [✗] Git未安装！
    echo.
    echo 请先下载安装Git:
    echo    https://git-scm.com/download/win
    echo.
    echo 下载后运行安装程序，安装时保持默认选项即可
    echo.
    echo 安装完成后，关闭此窗口，重新运行此脚本
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('git --version') do set gitVer=%%i
echo [✓] Git已安装: %gitVer%
echo.

REM 获取用户输入
echo [2/6] 配置部署信息
echo.
set /p githubUsername="请输入你的GitHub用户名: "
if "%githubUsername%"=="" (
    echo [✗] 用户名不能为空
    pause
    exit /b 1
)
echo.

set repoName=excel-validator
set deployDir=%~dp0excel_validator

if not exist "%deployDir%" (
    echo [✗] 未找到部署目录: %deployDir%
    pause
    exit /b 1
)
echo [✓] 部署目录: %deployDir%
echo.

REM 进入目录
cd /d "%deployDir%"
echo [3/6] 准备Git仓库...
echo.

if not exist ".git" (
    echo 执行: git init
    git init
    git branch -M main
    echo.
) else (
    echo Git仓库已存在，跳过初始化
    echo.
)

REM 添加文件
echo [4/6] 提交文件...
echo.
echo 执行: git add .
git add -A
echo.

REM 检查是否有文件要提交
git status --porcelain >temp_status.txt
for %%i in (temp_status.txt) do if %%~zi==0 (
    echo 没有需要提交的文件
) else (
    echo 执行: git commit -m "Initial commit"
    git commit -m "Initial commit: Excel数据校验工具"
)
del temp_status.txt 2>nul
echo.

REM 设置远程仓库
echo [5/6] 连接到GitHub...
echo.
set remoteUrl=https://github.com/%githubUsername%/%repoName%.git

git remote -v | findstr "origin" >nul
if %errorlevel% neq 0 (
    echo 执行: git remote add origin %remoteUrl%
    git remote add origin %remoteUrl%
) else (
    echo 执行: git remote set-url origin %remoteUrl%
    git remote set-url origin %remoteUrl%
)
echo.

REM 推送
echo [6/6] 推送到GitHub...
echo.
echo 执行: git push -u origin main
echo.
echo 正在推送，请稍候...
echo.
git push -u origin main --force

echo.
echo ==========================================
echo    推送完成！
echo ==========================================
echo.
echo 仓库地址: https://github.com/%githubUsername%/%repoName%
echo.
echo 后续操作:
echo    1. 打开上面的仓库地址
echo    2. 点击 Settings → Pages
echo    3. Branch 选择 "main"
echo    4. 点击 Save
echo    5. 等待1-2分钟部署
echo.
echo 访问地址:
echo    https://%githubUsername%.github.io/%repoName%/excel_validator.html
echo.
echo 如有问题，请手动执行以上步骤
echo.
pause
