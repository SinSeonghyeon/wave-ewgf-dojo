#!/usr/bin/env bash
# Codex_full.command — macOS 버전 (Codex_full.bat 이식)
# Finder에서 더블클릭하거나, 터미널에서 ./Codex_full.command 로 실행하세요.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

# codex / node / npm 가 설치될 수 있는 경로들을 PATH 앞에 추가
CODEX_PATHS="$HOME/.codex/bin:$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$HOME/.npm-global/bin"
export PATH="$CODEX_PATHS:$PATH"

log()  { echo "[Codex] $*"; }
fail() { log "Setup failed. Exit code: ${1:-1}"; exit "${1:-1}"; }

ensure_node() {
  log "Checking Node.js and npm..."
  if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
    log "Node.js and npm found."; return 0
  fi
  log "Node.js/npm missing."
  if command -v brew >/dev/null 2>&1; then
    log "Installing Node.js with Homebrew..."
    brew install node && command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1 && {
      log "Node.js and npm are ready."; return 0; }
  fi
  log "Node.js를 자동 설치하지 못했습니다. Homebrew 설치 후 다시 실행하세요:  https://brew.sh"
  return 1
}

install_codex() {
  # 1) Homebrew 포뮬러 (가장 빠르고 안정적)
  if command -v brew >/dev/null 2>&1; then
    log "Installing Codex with Homebrew..."
    if brew install codex 2>/dev/null; then
      export PATH="$CODEX_PATHS:$PATH"; hash -r 2>/dev/null || true
      command -v codex >/dev/null 2>&1 && { log "Homebrew install completed."; return 0; }
    fi
  fi
  # 2) 공식 스탠드얼론 설치 스크립트 (있을 경우)
  log "Trying the official standalone installer..."
  if curl -fsSL https://chatgpt.com/codex/install.sh | bash; then
    export PATH="$CODEX_PATHS:$PATH"; hash -r 2>/dev/null || true
    command -v codex >/dev/null 2>&1 && { log "Standalone installer completed."; return 0; }
  fi
  # 3) npm 폴백
  log "Falling back to npm installation."
  ensure_node || return 1
  log "Installing @openai/codex with npm..."
  npm install -g @openai/codex@latest --include=optional || { log "npm installation failed."; return 1; }
  export PATH="$CODEX_PATHS:$PATH"; hash -r 2>/dev/null || true
  command -v codex >/dev/null 2>&1 || { log "npm finished, but codex was not found on PATH."; return 1; }
  log "npm installation completed."; return 0
}

log "Step 1/4 - Checking Codex CLI..."
if command -v codex >/dev/null 2>&1; then
  log "Codex CLI found."
else
  log "Codex CLI was not found."
  install_codex || fail 1
fi

log "Step 2/4 - Verifying Codex CLI..."
export PATH="$CODEX_PATHS:$PATH"; hash -r 2>/dev/null || true
command -v codex >/dev/null 2>&1 || { log "Codex CLI is still unavailable after installation."; fail 1; }

log "Step 3/4 - Full access mode selected."
log "Step 4/4 - Launching Codex..."
codex --dangerously-bypass-approvals-and-sandbox "$@"
exit $?
