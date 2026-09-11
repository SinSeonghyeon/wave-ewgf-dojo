#!/usr/bin/env bash
# Claude_full.command — macOS 버전 (Claude_full.bat 이식)
# Finder에서 더블클릭하거나, 터미널에서 ./Claude_full.command 로 실행하세요.
set -uo pipefail

# 스크립트가 있는 폴더로 이동 (%~dp0 + pushd 에 해당)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

# Claude / node / npm 가 설치될 수 있는 경로들을 PATH 앞에 추가
CLAUDE_PATHS="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$HOME/.npm-global/bin"
export PATH="$CLAUDE_PATHS:$PATH"

log()  { echo "[Claude] $*"; }
fail() { log "Setup failed. Exit code: ${1:-1}"; exit "${1:-1}"; }

# ---------------------------------------------------------------------------
# CLAUDE.md <- AGENTS.md 동기화
# Claude Code는 CLAUDE.md는 자동 로드하지만 AGENTS.md는 안 함.
# ---------------------------------------------------------------------------
ensure_claude_md() {
  if [ ! -f "AGENTS.md" ]; then
    log "AGENTS.md not found. Skipping CLAUDE.md sync."
    return 0
  fi
  if [ -e "CLAUDE.md" ] || [ -L "CLAUDE.md" ]; then
    log "CLAUDE.md already present. Skipping sync."
    return 0
  fi
  # 맥은 관리자 권한 없이 심볼릭 링크 생성 가능
  if ln -s "AGENTS.md" "CLAUDE.md" 2>/dev/null; then
    log "Linked CLAUDE.md -> AGENTS.md (symbolic)."
    return 0
  fi
  log "Symbolic link failed. Falling back to file copy..."
  if cp "AGENTS.md" "CLAUDE.md" 2>/dev/null; then
    log "Copied AGENTS.md to CLAUDE.md."
    return 0
  fi
  log "Could not create CLAUDE.md from AGENTS.md. Continuing anyway."
  return 0
}

# ---------------------------------------------------------------------------
# 스킬 링크: .agents/skills/* 을 .claude/skills/ 안으로 링크
# ---------------------------------------------------------------------------
ensure_skill_links() {
  [ -d ".agents/skills" ] || return 0
  mkdir -p ".claude/skills"
  for src in .agents/skills/*/; do
    [ -d "$src" ] || continue
    local name; name="$(basename "$src")"
    local dest=".claude/skills/$name"
    # -L 병행: 타깃이 사라진 심볼릭 링크(-e는 false)도 "이미 있음"으로 취급해 ln 충돌을 막음
    if [ -e "$dest" ] || [ -L "$dest" ]; then
      log "Skill '$name' already present. Skipping."
      continue
    fi
    # 절대경로로 심볼릭 링크 (상대경로 링크 깨짐 방지)
    if ln -s "$SCRIPT_DIR/.agents/skills/$name" "$dest" 2>/dev/null; then
      log "Linked skill '$name' -> .agents/skills/$name (symlink)."
      continue
    fi
    log "Symlink failed for '$name'. Falling back to copy..."
    if cp -R "$src" "$dest" 2>/dev/null; then
      log "Copied skill '$name'."
      continue
    fi
    log "Could not provision skill '$name'. Continuing anyway."
  done
  return 0
}

# ---------------------------------------------------------------------------
# Node.js / npm 확인 및 설치
# ---------------------------------------------------------------------------
ensure_node() {
  log "Checking Node.js and npm..."
  if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
    log "Node.js and npm found."
    return 0
  fi
  log "Node.js/npm missing."
  if command -v brew >/dev/null 2>&1; then
    log "Installing Node.js with Homebrew..."
    brew install node && command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1 && {
      log "Node.js and npm are ready."; return 0; }
  fi
  log "Node.js를 자동 설치하지 못했습니다."
  log "Homebrew 설치 후 다시 실행하세요:  https://brew.sh"
  log '  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
  return 1
}

# ---------------------------------------------------------------------------
# Claude Code CLI 설치
# ---------------------------------------------------------------------------
install_claude() {
  log "Installing with the official native installer..."
  if curl -fsSL https://claude.ai/install.sh | bash; then
    export PATH="$CLAUDE_PATHS:$PATH"; hash -r 2>/dev/null || true
    if command -v claude >/dev/null 2>&1 || [ -x "$HOME/.local/bin/claude" ]; then
      log "Native installer completed."
      return 0
    fi
  fi

  log "Native installer did not make Claude available in this shell."
  log "Falling back to npm installation."
  ensure_node || return 1

  log "Installing @anthropic-ai/claude-code with npm..."
  if ! npm install -g @anthropic-ai/claude-code@latest --include=optional; then
    log "npm installation failed."
    return 1
  fi
  export PATH="$CLAUDE_PATHS:$PATH"; hash -r 2>/dev/null || true
  if ! command -v claude >/dev/null 2>&1; then
    log "npm finished, but claude was not found on PATH."
    return 1
  fi
  log "npm installation completed."
  return 0
}

# ===========================================================================
# 메인 흐름
# ===========================================================================
log "Step 1/6 - Checking Claude Code CLI..."
if command -v claude >/dev/null 2>&1; then
  log "Claude Code CLI found."
else
  log "Claude Code CLI was not found."
  install_claude || fail 1
fi

log "Step 2/6 - Verifying Claude Code CLI..."
export PATH="$CLAUDE_PATHS:$PATH"; hash -r 2>/dev/null || true
command -v claude >/dev/null 2>&1 || { log "Claude Code CLI is still unavailable after installation."; fail 1; }

log "Step 3/6 - Full access mode selected."

log "Step 4/6 - Syncing project instructions (CLAUDE.md <- AGENTS.md)..."
ensure_claude_md

log "Step 5/6 - Linking project skills (.claude/skills <- .agents/skills)..."
ensure_skill_links

log "Step 6/6 - Launching Claude Code..."
claude --dangerously-skip-permissions "$@"
exit $?
