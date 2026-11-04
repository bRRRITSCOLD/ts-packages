# PROTOTYPE: arm C input = convention naming (round-1 tree) + exceptions-only links.
import json
d = json.load(open("ab/screen.no-link.json"))
EXC = {
  "Button": {"v": 3, "props": {"disabled": {"from": "state", "map": {"Disabled": True, "Default": False}}}},
  "Card": {"v": 3, "slots": ["CardContent", "CardFooter"]},
}
def walk(n):
    c = n.get("component")
    if c and c["library"] == "Library":
        if c["name"] in EXC: n["link"] = EXC[c["name"]]
        if c["path"] == "icon": n.pop("children", None)
    for k in n.get("children", []): walk(k)
walk(d)
json.dump(d, open("ab/screen.convention.json", "w"), indent=1)
