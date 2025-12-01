import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Load the HTML file
        file_path = os.path.abspath("design_assets/asset_generator.html")
        url = f"file://{file_path}"
        print(f"Loading {url}...")
        await page.goto(url)

        # Wait for fonts to be ready
        await page.evaluate("document.fonts.ready")

        # Define elements to capture
        assets = [
            {"id": "#site_icon", "filename": "site_icon.png"},
            {"id": "#thumb_clean", "filename": "ogp_thumb_clean.png"},
            {"id": "#thumb_dark", "filename": "ogp_thumb_dark.png"},
            {"id": "#thumb_feature", "filename": "ogp_thumb_feature.png"},
        ]

        for asset in assets:
            element = await page.query_selector(asset["id"])
            if element:
                output_path = f"design_assets/{asset['filename']}"
                await element.screenshot(path=output_path)
                print(f"Generated {output_path}")
            else:
                print(f"Element {asset['id']} not found!")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
