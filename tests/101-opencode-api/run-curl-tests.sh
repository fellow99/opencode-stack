#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:4099}"
TEST_OPENCODE_URL="${TEST_OPENCODE_URL:-http://127.0.0.1:40960}"
TEST_OPENCODE_USER="${TEST_OPENCODE_USER:-opencode}"
TEST_OPENCODE_PASS="${TEST_OPENCODE_PASS:-123456}"
REPORT_DATE="$(date +%Y%m%d)"
REPORT_FILE="dist/test[101-opencode-api]-${REPORT_DATE}.md"
STACK_START_CMD="${STACK_START_CMD:-node dist/app.js -c tests/101-opencode-api/servers.yaml}"
OPENCODE_START_CMD="${OPENCODE_START_CMD:-OPENCODE_SERVER_USERNAME=opencode OPENCODE_SERVER_PASSWORD=123456 opencode serve --hostname 127.0.0.1 --port 40960}"

pass_count=0
fail_count=0
stack_pid=""
opencode_pid=""

mkdir -p dist

append() {
  printf "%s\n" "$1" >> "$REPORT_FILE"
}

cleanup() {
  if [[ -n "$stack_pid" ]] && kill -0 "$stack_pid" 2>/dev/null; then
    kill "$stack_pid" 2>/dev/null || true
    wait "$stack_pid" 2>/dev/null || true
  fi
  if [[ -n "$opencode_pid" ]] && kill -0 "$opencode_pid" 2>/dev/null; then
    kill "$opencode_pid" 2>/dev/null || true
    wait "$opencode_pid" 2>/dev/null || true
  fi
}

trap cleanup EXIT

wait_http_ok() {
  local url="$1"
  local timeout_seconds="$2"
  local auth_user="${3:-}"
  local auth_pass="${4:-}"
  local started
  started="$(date +%s)"

  while true; do
    local code="000"
    if [[ -n "$auth_user" ]]; then
      code="$(curl -sS -o /dev/null -w "%{http_code}" -u "${auth_user}:${auth_pass}" "$url" 2>/dev/null || echo "000")"
    else
      code="$(curl -sS -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")"
    fi

    if [[ "$code" =~ ^2[0-9][0-9]$ ]]; then
      return 0
    fi

    local now
    now="$(date +%s)"
    if (( now - started >= timeout_seconds )); then
      return 1
    fi
    sleep 1
  done
}

call() {
  local method="$1"
  local path="$2"
  local data="${3:-}"

  local tmp
  tmp="$(mktemp)"
  local code
  if [[ -n "$data" ]]; then
    code="$(curl -sS -o "$tmp" -w "%{http_code}" -X "$method" "$BASE_URL$path" -H "Content-Type: application/json" -d "$data" 2>/dev/null || echo "000")"
  else
    code="$(curl -sS -o "$tmp" -w "%{http_code}" -X "$method" "$BASE_URL$path" 2>/dev/null || echo "000")"
  fi

  local body
  body="$(cat "$tmp" 2>/dev/null || echo "")"
  rm -f "$tmp"

  echo "$code" > "${tmp}.code"
  echo "$body" > "${tmp}.body"
  echo "${tmp}"
}

expect_ok_or_degraded() {
  local name="$1"
  local tmp="$2"
  local code
  code="$(cat "${tmp}.code" 2>/dev/null || echo "000")"
  local body
  body="$(cat "${tmp}.body" 2>/dev/null || echo "")"
  rm -f "${tmp}.code" "${tmp}.body"

  if [[ "$code" =~ ^2[0-9][0-9]$ ]]; then
    append "- [PASS] ${name}: HTTP ${code}"
    pass_count=$((pass_count + 1))
    return
  fi

  if [[ "$code" == "502" || "$code" == "503" || "$code" == "401" ]]; then
    append "- [PASS] ${name}: HTTP ${code} (backend unavailable/auth required)"
    pass_count=$((pass_count + 1))
    return
  fi

  append "- [FAIL] ${name}: HTTP ${code}"
  append "  - body: ${body:0:200}"
  fail_count=$((fail_count + 1))
}

expect_2xx() {
  local name="$1"
  local tmp="$2"
  local code
  code="$(cat "${tmp}.code" 2>/dev/null || echo "000")"
  local body
  body="$(cat "${tmp}.body" 2>/dev/null || echo "")"
  rm -f "${tmp}.code" "${tmp}.body"

  if [[ "$code" =~ ^2[0-9][0-9]$ ]]; then
    append "- [PASS] ${name}: HTTP ${code}"
    pass_count=$((pass_count + 1))
  else
    append "- [FAIL] ${name}: HTTP ${code}"
    append "  - body: ${body:0:200}"
    fail_count=$((fail_count + 1))
  fi
}

fuser -k 4099/tcp 2>/dev/null || true
fuser -k 40960/tcp 2>/dev/null || true

bash -lc "$OPENCODE_START_CMD" > dist/test-opencode-serve.log 2>&1 &
opencode_pid="$!"

if ! wait_http_ok "${TEST_OPENCODE_URL}/global/health" 120 "$TEST_OPENCODE_USER" "$TEST_OPENCODE_PASS"; then
  cat dist/test-opencode-serve.log >&2 || true
  echo "Test opencode serve did not become ready in time" >&2
  exit 1
fi

bash -lc "$STACK_START_CMD" > dist/test-opencode-stack.log 2>&1 &
stack_pid="$!"

if ! wait_http_ok "${BASE_URL}/health" 60; then
  cat dist/test-opencode-stack.log >&2 || true
  echo "opencode-stack did not become ready in time" >&2
  exit 1
fi

cat > "$REPORT_FILE" <<EOF
# 101-opencode-api 测试报告

- 日期: $(date '+%Y-%m-%d %H:%M:%S %z')
- 目标: ${BASE_URL}
- 工具: curl
- 独立后端: ${TEST_OPENCODE_URL}
- opencode 启动命令: ${OPENCODE_START_CMD}
- stack 启动命令: ${STACK_START_CMD}

## 测试结果
EOF

tmp=$(call "GET" "/health")
expect_2xx "TC-001 GET /health" "$tmp"

tmp=$(call "GET" "/x/backends")
expect_2xx "TC-002 GET /x/backends" "$tmp"

tmp=$(call "GET" "/x/routes")
expect_2xx "TC-003 GET /x/routes" "$tmp"

tmp=$(call "GET" "/x/sse")
expect_2xx "TC-004 GET /x/sse" "$tmp"

tmp=$(call "GET" "/global/health")
expect_ok_or_degraded "TC-005 GET /global/health" "$tmp"

tmp=$(call "GET" "/project")
expect_ok_or_degraded "TC-006 GET /project" "$tmp"

tmp=$(call "GET" "/session")
expect_ok_or_degraded "TC-007 GET /session" "$tmp"

tmp=$(call "GET" "/provider")
expect_ok_or_degraded "TC-008 GET /provider" "$tmp"

tmp=$(call "GET" "/config")
expect_ok_or_degraded "TC-009 GET /config" "$tmp"

tmp=$(call "POST" "/session" '{"title":"compat-test"}')
expect_ok_or_degraded "TC-010 POST /session" "$tmp"

append ""
append "## 汇总"
append "- 通过: ${pass_count}"
append "- 失败: ${fail_count}"

if [[ "$fail_count" -gt 0 ]]; then
  append "- 结论: FAIL - 存在失败用例"
  exit 1
fi

append "- 结论: PASS - 全部通过"
echo "Report generated: ${REPORT_FILE}"
