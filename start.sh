#!/usr/bin/env bash
set -euo pipefail

# --- 配置 ---
BACKEND_PORT=19998
FRONTEND_PORT=19999
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
OS_NAME="$(uname -s)"
IS_DARWIN=false
if [ "$OS_NAME" = "Darwin" ]; then
  IS_DARWIN=true
  echo "检测到 macOS 环境"
fi

# --- 运行前检查 ---
# 先检查 npm，前端必须依赖 npm
if ! command -v npm &> /dev/null; then
    echo "错误：未找到 'npm' 命令。请安装 Node.js 和 npm 以运行前端。"
    exit 1
fi

# --- 端口清理函数 ---
cleanup_port() {
    local port=$1
    echo "检查端口 $port 上的进程..."
    if command -v lsof &> /dev/null; then
        if lsof -t -i:$port > /dev/null; then
            echo "检测到端口 $port 有进程，使用 lsof 强制结束..."
            kill -9 $(lsof -t -i:$port) || true
        else
            echo "端口 $port 空闲。"
        fi
    elif command -v fuser &> /dev/null && [ "$IS_DARWIN" != "true" ]; then
        if fuser -k -n tcp $port > /dev/null 2>&1; then
            echo "已使用 fuser 结束端口 $port 上的进程。"
        else
            echo "端口 $port 空闲。"
        fi
    else
        echo "警告：未找到 'lsof' 或 'fuser' 命令，跳过端口 $port 的清理。"
        echo "请确认端口 $port 未被占用。"
    fi
}

# --- 执行端口清理 ---
echo "--- 开始端口清理 ---"
cleanup_port $BACKEND_PORT
cleanup_port $FRONTEND_PORT
echo "--- 端口清理完成 ---"


# --- 后端环境搭建 ---
cd "$BACKEND_DIR"
echo "--- 准备后端环境 ---"

if [ ! -d "venv" ]; then
  echo "正在创建 Python 虚拟环境..."
  python3 -m venv venv
fi

# 为保证 POSIX 兼容性，使用 '.' 而不是 'source'
. venv/bin/activate

echo "正在安装/检查后端依赖..."
pip install -r requirements.txt > /dev/null

if [ ! -f ".env" ] && [ -f "env_example.txt" ]; then
  echo "根据示例创建 .env..."
  cp env_example.txt .env
fi

if ! grep -q "^PORT=" .env; then
  echo "PORT=$BACKEND_PORT" >> .env
fi

echo "后台启动后端服务..."
echo "后端日志保存到：$BACKEND_DIR/backend.log"

# 使用 nohup 并重定向到指定日志文件，避免写入 nohup.out
nohup python3 app.py > "$BACKEND_DIR/backend.log" 2>&1 &
BACK_PID=$!
sleep 3 # 给后端更多时间初始化

# 检查后端进程是否仍在运行
if ! kill -0 $BACK_PID 2>/dev/null; then
    echo "错误：后端服务启动失败。请查看日志：$BACKEND_DIR/backend.log 与 $BACKEND_DIR/logs/app.log"
    exit 1
fi

# 额外检查端口是否已监听
if ! curl -s -I "http://127.0.0.1:$BACKEND_PORT" >/dev/null 2>&1; then
  echo "警告：后端端口尚未就绪，稍后前端可能无法连接。日志：$BACKEND_DIR/backend.log"
fi
echo "后端服务已启动，进程 PID:$BACK_PID"


# --- 前端环境搭建 ---
cd "$ROOT_DIR"
echo "--- 准备前端环境 ---"

if [ ! -d "node_modules" ]; then
  echo "正在安装前端依赖(npm install)..."
  npm install
fi

# --- 退出时清理 ---
# 在脚本退出时触发（例如 Ctrl+C）
trap 'echo; echo "--- 正在关闭 ---"; echo "正在停止后端服务(PID:$BACK_PID)..."; kill $BACK_PID 2>/dev/null || true; echo "后端服务已停止。"' EXIT INT TERM

# --- 启动前端开发服务器 ---
echo "--- 启动前端开发服务器 ---"
echo "现在可访问前端: http://localhost:$FRONTEND_PORT"
export VITE_API_URL="http://localhost:$BACKEND_PORT/api"
echo "按 Ctrl+C 结束两个服务。"
echo "------------------------------------"
npm run dev -- --port $FRONTEND_PORT --host