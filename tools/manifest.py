# Sorts processed clips into game pools and writes src/sounds.json + CREDITS.md.
import json, os
d = json.load(open("features.json"))
EXCLUDE = {"fart_469695_0", "fart_674231_0", "fart_792810_0", "fart_459938_0", "fart_448212_1",
           "fart_492763_1", "shart_585722_2", "shart_585722_4"}
EXCLUDE_SRC = {"777448", "650695", "663636"}  # "fake" (mouth-made) packs
pools, used = {}, []
def tier(dur, cuts):
    return 1 + sum(dur >= c for c in cuts)
for x in d:
    if x["name"] in EXCLUDE or x["src"] in EXCLUDE_SRC:
        os.remove(f"../public/sfx/{x['name']}.mp3"); continue
    t = x["title"].lower()
    if x["kind"] == "fart":
        style = "wet" if (x["query"] == "wet fart" or any(w in t for w in ("juicy", "wet", "chili", "poop"))) else \
                "squeak" if ("squeak" in t or (x["tonal"] > 25 and x["cen"] > 400)) else "dry"
        key = f"fart_{style}_{tier(x['dur'], (0.45, 0.8, 1.4, 2.2))}"
    elif x["kind"] == "burp":
        key = f"burp_{tier(x['dur'], (0.5, 0.8, 1.3, 2.3))}"
    else:
        key = "shart"
    pools.setdefault(key, []).append({"f": x["name"], "d": x["dur"]})
    used.append(x)
json.dump(dict(sorted(pools.items())), open("../src/sounds.json", "w"), indent=1)
for k, v in sorted(pools.items()): print(k, len(v))
srcs = {}
for x in used: srcs.setdefault(x["src"], x)
with open("../CREDITS.md", "w", encoding="utf8") as f:
    f.write("# Sound credits\n\nAll sounds come from [Freesound](https://freesound.org) and carry the "
            "[Creative Commons 0](https://creativecommons.org/publicdomain/zero/1.0/) licence (public domain).\n"
            "No attribution is required. We list the creators anyway, because they earned it.\n\n"
            "| Freesound ID | Title | Creator |\n|---|---|---|\n")
    for s in sorted(srcs.values(), key=lambda s: int(s["src"])):
        f.write(f"| [{s['src']}](https://freesound.org/s/{s['src']}/) | {s['title'].replace('|', '/')} | {s['user']} |\n")
print(len(used), "clips from", len(srcs), "sources")
