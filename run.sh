#!/usr/bin/env bash
#
# AI Hukuki Asistan — yerel çalıştırma script'i
#
#   ./run.sh start     → Docker'ı (gerekirse) başlatır, uygulamayı ayağa kaldırır
#   ./run.sh stop      → uygulamayı durdurur (veritabanı verisi korunur)
#   ./run.sh restart   → durdurup yeniden başlatır
#   ./run.sh status    → konteyner durumunu ve sağlık kontrolünü gösterir
#   ./run.sh logs      → uygulama loglarını canlı izler
#   ./run.sh rebuild   → imajı yeniden derleyip başlatır (şema/paket değişiminden sonra)
#   ./run.sh payall    → [SADECE DEV] tüm belgeleri 'odendi' işaretler (paywall'ı yerelde atlar)
#
# Port SABİTTİR ve hiç değişmez: 37429
#
set -euo pipefail

# --- sabitler ---------------------------------------------------------------
readonly WEB_PORT=37429                       # sabit rastgele port — DEĞİŞTİRMEYİN
readonly APP_URL="http://localhost:${WEB_PORT}"
readonly COMPOSE="docker-compose.dev.yml"
readonly HEALTH_URL="${APP_URL}/api/health"

# script'in bulunduğu dizin = proje kökü; her yerden çalışsın diye oraya geç
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export WEB_PORT APP_URL

# --- renkler ----------------------------------------------------------------
if [ -t 1 ]; then
  BOLD=$'\033[1m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RED=$'\033[31m'; DIM=$'\033[2m'; RESET=$'\033[0m'
else
  BOLD=""; GREEN=""; YELLOW=""; RED=""; DIM=""; RESET=""
fi

log()  { echo "${DIM}›${RESET} $*"; }
ok()   { echo "${GREEN}✓${RESET} $*"; }
warn() { echo "${YELLOW}!${RESET} $*"; }
err()  { echo "${RED}✗${RESET} $*" >&2; }

# Tıklanabilir URL: destekleyen terminallerde (iTerm2, VSCode, WezTerm…) OSC 8
# hyperlink olarak, diğerlerinde düz metin URL olarak görünür — her ikisi de tıklanabilir.
print_link() {
  local url="$1"
  printf '  %s\033]8;;%s\033\\%s%s%s\033]8;;\033\\%s\n' \
    "$BOLD" "$url" "$GREEN" "$url" "$RESET" "$RESET"
}

# --- docker daemon --------------------------------------------------------
ensure_docker() {
  if docker info >/dev/null 2>&1; then
    return 0
  fi
  warn "Docker çalışmıyor, başlatılıyor..."
  if [[ "$(uname)" == "Darwin" ]]; then
    open -a Docker >/dev/null 2>&1 || { err "Docker Desktop başlatılamadı. Elle açın."; exit 1; }
  else
    err "Docker daemon kapalı. Lütfen Docker'ı başlatın ve tekrar deneyin."
    exit 1
  fi
  log "Docker'ın hazır olması bekleniyor..."
  local tries=0
  until docker info >/dev/null 2>&1; do
    tries=$((tries + 1))
    if [ "$tries" -gt 90 ]; then       # ~3 dk
      err "Docker zamanında hazır olmadı."
      exit 1
    fi
    sleep 2
  done
  ok "Docker hazır."
}

ensure_env() {
  if [ ! -f .env ]; then
    cp .env.example .env
    warn ".env bulunamadı, .env.example'dan oluşturuldu."
    warn "Uygulamanın çalışması için .env içine gerçek ANTHROPIC_API_KEY girin (iyzico sandbox anahtarları ödeme için)."
  fi
}

wait_for_db() {
  log "Veritabanının hazır olması bekleniyor..."
  local tries=0
  until docker compose -f "$COMPOSE" exec -T db pg_isready -U app -d hukuki >/dev/null 2>&1; do
    tries=$((tries + 1))
    if [ "$tries" -gt 60 ]; then       # ~1 dk
      err "Veritabanı hazır olmadı."
      exit 1
    fi
    sleep 1
  done
  ok "Veritabanı hazır."
}

wait_for_web() {
  log "Uygulamanın yanıt vermesi bekleniyor..."
  local tries=0
  until curl -fsS "$HEALTH_URL" >/dev/null 2>&1; do
    tries=$((tries + 1))
    if [ "$tries" -gt 90 ]; then       # ~1.5 dk (ilk derleme uzun sürebilir)
      warn "Uygulama henüz yanıt vermiyor; loglara bakın: ./run.sh logs"
      return 0
    fi
    sleep 1
  done
  ok "Uygulama ayakta."
}

banner() {
  echo
  echo "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo "  ${BOLD}AI Hukuki Asistan çalışıyor${RESET}"
  echo
  print_link "$APP_URL"
  echo "  ${DIM}sağlık:${RESET} ${DIM}${HEALTH_URL}${RESET}"
  echo "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo
}

# --- komutlar --------------------------------------------------------------
cmd_start() {
  local build_flag="${1:-}"
  ensure_docker
  ensure_env
  log "Konteynerler başlatılıyor (port ${BOLD}${WEB_PORT}${RESET})..."
  docker compose -f "$COMPOSE" up -d ${build_flag}
  wait_for_db
  log "Veritabanı migration'ları uygulanıyor..."
  docker compose -f "$COMPOSE" run --rm app npx prisma migrate deploy >/dev/null
  ok "Migration'lar güncel."
  wait_for_web
  banner
}

cmd_stop() {
  ensure_docker
  log "Uygulama durduruluyor (veritabanı verisi korunuyor)..."
  docker compose -f "$COMPOSE" down
  ok "Durduruldu."
}

cmd_status() {
  ensure_docker
  docker compose -f "$COMPOSE" ps
  echo
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    ok "Uygulama ayakta:"
    print_link "$APP_URL"
  else
    warn "Uygulama yanıt vermiyor. Başlatmak için: ./run.sh start"
  fi
}

cmd_logs() {
  docker compose -f "$COMPOSE" logs -f app
}

# [SADECE DEV] Ödeme entegrasyonu olmadan indirme akışını test edebilmek için
# tüm belgeleri 'odendi' işaretler. docker-compose.dev.yml üzerinden çalıştığı
# için yalnızca yerel geliştirme veritabanına dokunabilir.
cmd_payall() {
  ensure_docker
  warn "Geliştirme kısayolu: TÜM belgeler 'odendi' olarak işaretleniyor (paywall yerelde atlanır)."
  local updated
  updated=$(docker compose -f "$COMPOSE" exec -T db psql -U app -d hukuki -tA -c \
    "WITH guncellenen AS (UPDATE \"Document\" SET durum = 'odendi' WHERE durum <> 'odendi' RETURNING id) SELECT count(*) FROM guncellenen;") \
    || { err "Veritabanına ulaşılamadı. Uygulama ayakta mı? → ./run.sh start"; exit 1; }
  ok "${updated} belge 'odendi' olarak işaretlendi (kalanlar zaten ödenmişti)."

  # İndirme kapısı sahiplik de ister: sahipsiz (userId'siz) Case'e bağlı belgeler
  # 'odendi' olsa bile /download 404 döner. Varsa kullanıcıyı uyar.
  local sahipsiz
  sahipsiz=$(docker compose -f "$COMPOSE" exec -T db psql -U app -d hukuki -tA -c \
    "SELECT count(*) FROM \"Document\" d JOIN \"Case\" c ON c.id = d.\"caseId\" WHERE c.\"userId\" IS NULL;")
  if [ "${sahipsiz}" != "0" ]; then
    warn "${sahipsiz} belge sahipsiz vakaya bağlı — bunlar giriş yapan kullanıcıya ait olmadığı için indirme yine 404 verir."
    warn "Çözüm: belgeyi giriş yapmış bir hesapla oluşturun ya da vakayı bir kullanıcıya bağlayın."
  fi
}

usage() {
  cat <<EOF
${BOLD}AI Hukuki Asistan — yerel çalıştırma${RESET}

Kullanım: ./run.sh <komut>

  ${BOLD}start${RESET}     Docker'ı (gerekirse) başlatır ve uygulamayı ayağa kaldırır
  ${BOLD}stop${RESET}      Uygulamayı durdurur (veritabanı verisi korunur)
  ${BOLD}restart${RESET}   Durdurup yeniden başlatır
  ${BOLD}rebuild${RESET}   İmajı yeniden derleyip başlatır (şema/paket değişiminden sonra)
  ${BOLD}status${RESET}    Konteyner durumu + sağlık kontrolü
  ${BOLD}logs${RESET}      Uygulama loglarını canlı izler
  ${BOLD}payall${RESET}    [SADECE DEV] Tüm belgeleri 'odendi' işaretler (paywall'ı yerelde atlar)

Sabit port: ${BOLD}${WEB_PORT}${RESET}  →  ${APP_URL}
EOF
}

case "${1:-}" in
  start)   cmd_start ;;
  stop)    cmd_stop ;;
  restart) cmd_stop; cmd_start ;;
  rebuild) cmd_start "--build" ;;
  status)  cmd_status ;;
  logs)    cmd_logs ;;
  payall)  cmd_payall ;;
  ""|-h|--help|help) usage ;;
  *) err "Bilinmeyen komut: $1"; echo; usage; exit 1 ;;
esac
