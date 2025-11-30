import time
import os
import sys
import http.server
import threading
from playwright.sync_api import sync_playwright

# Data to write
csv_content = """売上確定日,売上金額,サービス名,購入者名,内訳
2025/11/01,5000,Webサイト制作,田中太郎,販売手数料
2025/11/02,3000,ロゴデザイン,鈴木一郎,システム利用料
2025/11/03,10000,SEO対策,佐藤花子,振込手数料
2025/11/04,2000,バナー作成,山田次郎,販売手数料
2025/11/05,1500,記事執筆,高橋美咲,システム利用料
2025/11/06,8000,動画編集,伊藤健太,振込手数料
2025/11/07,4500,翻訳サービス,渡辺直人,販売手数料
2025/11/08,6000,イラスト作成,山本優子,システム利用料
2025/11/09,7000,マーケティング相談,中村理恵,振込手数料
2025/11/10,2500,データ入力,小林正樹,販売手数料
2025/11/11,3500,キャッチコピー作成,加藤浩二,システム利用料
2025/11/12,9000,SNS運用代行,吉田麻衣,振込手数料
2025/11/13,5500,LP制作,佐々木亮,販売手数料
2025/11/14,4000,名刺デザイン,松本香織,システム利用料
2025/11/15,12000,ECサイト構築,井上達也,振込手数料
2025/11/16,1800,画像加工,木村あゆみ,販売手数料
2025/11/17,3200,音声文字起こし,林修平,システム利用料
2025/11/18,7500,占い鑑定,清水由美,振込手数料
2025/11/19,4800,悩み相談,山崎大輔,販売手数料
2025/11/20,2200,アイコン作成,池田真由美,システム利用料
2025/11/21,6500,プログラミング指導,橋本健一,振込手数料
2025/11/22,3800,パワーポイント作成,阿部千尋,販売手数料
2025/11/23,5200,チラシデザイン,村上隆,システム利用料
2025/11/24,8500,ブログコンサル,石川さゆり,振込手数料
2025/11/25,2800,似顔絵作成,中島悟,販売手数料
2025/11/26,4200,ネーミング,前田敦子,システム利用料
2025/11/27,9500,オンライン秘書,藤田ニコル,振込手数料
2025/11/28,5800,YouTubeサムネイル,岡田准一,販売手数料
2025/11/29,3300,音楽制作,近藤春菜,システム利用料
2025/11/30,11000,アプリ開発,遠藤憲一,振込手数料
"""

# Write CSV with Shift-JIS
with open("dummy_data.csv", "w", encoding="shift_jis") as f:
    f.write(csv_content)

print("Created dummy_data.csv")

# Start server
PORT = 8080
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
    page.set_viewport_size({"width": 1280, "height": 1200}) # Taller height to capture full tabs

    # 1. Load page
    page.goto(f'http://localhost:{PORT}/index.html')
    time.sleep(2)

    # Screenshot Upload Screen (before upload)
    # Scroll to dropZone
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
    time.sleep(2) # wait for charts animation

    # 3. Screenshot Summary Tab
    # It is active by default.
    # We capture the content of the tab
    summary_tab = page.locator("#summary")
    summary_tab.scroll_into_view_if_needed()
    time.sleep(0.5)
    summary_tab.screenshot(path="images/summary_tab.png")
    print("Saved images/summary_tab.png")

    # 4. Screenshot Details Tab
    page.click("#details-tab")
    time.sleep(2) # wait for tab switch and chart animation
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
    # Expand accordion if not already (it is "show" class by default in HTML)
    # Scroll to top to see filter section
    page.evaluate("window.scrollTo(0, 0)")
    time.sleep(0.5)
    # The usage guide shows the filter section.
    # I will screenshot the accordion item.
    page.locator("#controlsAccordion").screenshot(path="images/filter_export.png")
    print("Saved images/filter_export.png")

    browser.close()
