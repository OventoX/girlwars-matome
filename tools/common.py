import os
import re
import json
import hashlib
import urllib.request
import urllib.parse
from bs4 import BeautifulSoup

CACHE_DIR = os.path.join(os.path.dirname(__file__), 'cache')
os.makedirs(CACHE_DIR, exist_ok=True)

DEFAULT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
}

def get_url_cache_path(url):
    h = hashlib.sha256(url.encode('utf-8')).hexdigest()[:16]
    clean_name = re.sub(r'[^a-zA-Z0-9_\-]', '_', url.split('/')[-1])[:30]
    return os.path.join(CACHE_DIR, f"{clean_name}_{h}.html")

def fetch_html(url, use_cache=True, headers=None, timeout=15):
    cache_path = get_url_cache_path(url)
    if use_cache and os.path.exists(cache_path):
        with open(cache_path, 'r', encoding='utf-8', errors='replace') as f:
            return f.read()

    req_headers = DEFAULT_HEADERS.copy()
    if headers:
        req_headers.update(headers)

    req = urllib.request.Request(url, headers=req_headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            html = res.read().decode('utf-8', errors='replace')
            with open(cache_path, 'w', encoding='utf-8') as f:
                f.write(html)
            return html
    except Exception as e:
        print(f"[ERROR] Failed to fetch {url}: {e}")
        if os.path.exists(cache_path):
            print(f"[INFO] Using stale cache for {url}")
            with open(cache_path, 'r', encoding='utf-8', errors='replace') as f:
                return f.read()
        return None

def parse_soup(html):
    if not html:
        return None
    return BeautifulSoup(html, 'html.parser')
