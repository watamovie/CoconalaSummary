import time
import os
import sys
import http.server
import threading
import random
import datetime
from playwright.sync_api import sync_playwright

# --- Generate Dummy Data ---

services = [
    "Webサイト制作", "ロゴデザイン", "SEO対策", "バナー作成", "記事執筆",
    "動画編集", "翻訳サービス", "イラスト作成", "マーケティング相談", "データ入力",
    "キャッチコピー作成", "SNS運用代行", "LP制作", "名刺デザイン", "ECサイト構築",
    "画像加工", "音声文字起こし", "占い鑑定", "悩み相談", "アイコン作成",
    "プログラミング指導", "パワーポイント作成", "チラシデザイン", "ブログコンサル", "似顔絵作成",
    "ネーミング", "オンライン秘書", "YouTubeサムネイル", "音楽制作", "アプリ開発"
]

names = [
    "田中太郎", "鈴木一郎", "佐藤花子", "山田次郎", "高橋美咲", "伊藤健太", "渡辺直人", "山本優子", "中村理恵", "小林正樹",
    "加藤浩二", "吉田麻衣", "佐々木亮", "松本香織", "井上達也", "木村あゆみ", "林修平", "清水由美", "山崎大輔", "池田真由美",
    "橋本健一", "阿部千尋", "村上隆", "石川さゆり", "中島悟", "前田敦子", "藤田ニコル", "岡田准一", "近藤春菜", "遠藤憲一",
    "ユーザーA", "ユーザーB", "ユーザーC", "ユーザーD", "ユーザーE"
]

breakdowns = ["販売手数料", "システム利用料", "振込手数料", "基本料金", "オプション支払い", "おひねり(追加支払い)"]

# Generate dates from July 1, 2025 to Nov 30, 2025
start_date = datetime.date(2025, 7, 1)
end_date = datetime.date(2025, 11, 30)
delta = end_date - start_date

data_rows = []
for i in range(delta.days + 1):
    current_date = start_date + datetime.timedelta(days=i)
    # Random number of transactions per day (0 to 5)
    num_transactions = random.randint(0, 5)

    # Increase transactions on weekends
    if current_date.weekday() >= 5: # Sat, Sun
        num_transactions += random.randint(1, 3)

    for _ in range(num_transactions):
        service = random.choice(services)
        name = random.choice(names)
        breakdown = random.choice(breakdowns)

        # Amount varies by service loosely
        base_amount = random.randint(1, 100) * 100
        if "制作" in service or "構築" in service or "開発" in service:
            base_amount += random.randint(50, 500) * 100

        amount = base_amount

        # Format date as YYYY/MM/DD
        date_str = current_date.strftime("%Y/%m/%d")

        # ID is optional but helps with unique identification
        user_id = str(names.index(name) + 1000)

        # CSV format: 売上確定日,売上金額,サービス名,購入者名,内訳,購入者ID
        # Note: Added Purchase ID for better repeat tracking if script uses it
        data_rows.append(f"{date_str},{amount},{service},{name},{breakdown},{user_id}")

csv_header = "売上確定日,売上金額,サービス名,購入者名,内訳,購入者ID"
csv_content = csv_header + "\n" + "\n".join(data_rows)

# Write CSV with Shift-JIS
with open("dummy_data.csv", "w", encoding="shift_jis") as f:
    f.write(csv_content)

print(f"Created dummy_data.csv with {len(data_rows)} rows.")

# --- Screenshot Logic ---

# Start server
PORT = 8083 # Changed port to avoid conflict
def run_server():
    os.chdir('.')
    handler = http.server.SimpleHTTPRequestHandler
    http.server.HTTPServer(("", PORT), handler).serve_forever()

server_thread = threading.Thread(target=run_server, daemon=True)
server_thread.start()
time.sleep(2) # Wait for server

with sync_playwright() as p:
    browser = p.chromium.launch()
    # Use Japanese locale
    context = browser.new_context(locale='ja-JP')
    page = context.new_page()
    page.set_viewport_size({"width": 1280, "height": 1200})

    # 1. Load page
    page.goto(f'http://localhost:{PORT}/index.html')
    # Wait for fonts to load
    page.evaluate("document.fonts.ready")
    time.sleep(2)

    # Screenshot Upload Screen (before upload)
    page.locator("#dropZone").scroll_into_view_if_needed()
    time.sleep(0.5)
    page.screenshot(path="images/upload_screen.png")
    print("Saved images/upload_screen.png")

    # 2. Upload file
    with page.expect_file_chooser() as fc_info:
        page.click("#dropZone")
    file_chooser = fc_info.value
    file_chooser.set_files("dummy_data.csv")

    # Wait for dashboard to appear
    page.wait_for_selector("#dashboard", state="visible")
    time.sleep(3) # wait for charts animation

    # 3. Screenshot Summary Tab
    summary_tab = page.locator("#summary")
    summary_tab.scroll_into_view_if_needed()
    time.sleep(0.5)
    summary_tab.screenshot(path="images/summary_tab.png")
    print("Saved images/summary_tab.png")

    # 4. Screenshot Details Tab
    page.click("#details-tab")
    time.sleep(2)
    details_tab = page.locator("#details")
    details_tab.scroll_into_view_if_needed()
    time.sleep(0.5)
    details_tab.screenshot(path="images/details_tab.png")
    print("Saved images/details_tab.png")

    # 5. Screenshot Analysis Tab
    page.click("#analysis-tab")
    time.sleep(2)
    analysis_tab = page.locator("#analysis")
    analysis_tab.scroll_into_view_if_needed()
    time.sleep(0.5)
    analysis_tab.screenshot(path="images/analysis_tab.png")
    print("Saved images/analysis_tab.png")

    # 6. Screenshot Filter & Export
    # Scroll to top
    page.evaluate("window.scrollTo(0, 0)")
    time.sleep(0.5)
    page.locator("#controlsAccordion").screenshot(path="images/filter_export.png")
    print("Saved images/filter_export.png")

    browser.close()
