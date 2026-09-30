# Collects CC0-only sound metadata from Freesound search pages.
import re, json, sys, urllib.request, urllib.parse, html, time
UA = {"User-Agent": "Mozilla/5.0"}
queries = sys.argv[1:] or ["fart"]
out = {}
for q in queries:
    for page in range(1, 6):
        url = "https://freesound.org/search/?" + urllib.parse.urlencode({
            "q": q, "f": 'license:"Creative Commons 0"', "s": "Rating highest first", "page": page})
        try:
            s = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20).read().decode("utf8")
        except Exception as e:
            print("ERR", q, page, e, file=sys.stderr); break
        blocks = re.findall(r'class="bw-player"(.*?)tabindex', s, re.S)
        if not blocks: break
        for b in blocks:
            g = lambda k: (re.search(k + r'="([^"]*)"', b) or [None, None])[1]
            sid = g("data-sound-id")
            if sid in out: continue
            out[sid] = {"id": sid, "user": g("data-username"), "title": html.unescape(g("data-title") or ""),
                        "dur": float(g("data-duration") or 0), "mp3": (g("data-mp3") or "").replace("-lq.mp3", "-hq.mp3"),
                        "downloads": int(g("data-num-downloads") or 0), "query": q}
        time.sleep(0.5)
json.dump(list(out.values()), sys.stdout, indent=1)
