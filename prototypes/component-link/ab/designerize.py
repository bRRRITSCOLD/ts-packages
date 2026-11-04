# PROTOTYPE: derive the "designer naming" A/B inputs from the real Penpot dump.
import json, sys, copy
src, out_dir = sys.argv[1], sys.argv[2]
d = json.load(open(src))
PKG = "@brrritscold/core-react"
BTN_TYPE = {"default": "Primary", "destructive": "Danger", "outline": "Secondary", "ghost": "Subtle"}
BTN_SIZE = {"default": "Medium", "sm": "Small"}
TAG_STYLE = {"default": "Neutral", "secondary": "Muted", "destructive": "Error", "outline": "Outlined"}
PARTS = {"CardHeader": "Header", "CardTitle": "Title", "CardDescription": "Subtitle", "CardContent": "Body", "CardFooter": "Actions"}
ICONS = {"Mail": "ic_envelope", "Trash2": "ic_bin"}
inv = lambda m: {v: k for k, v in m.items()}
LINKS = {
  "CTA": {"v": 3, "package": PKG, "export": "Button",
          "props": {"variant": {"from": "Type", "map": inv(BTN_TYPE)},
                    "size": {"from": "Size", "map": inv(BTN_SIZE)},
                    "disabled": {"from": "State", "map": {"Disabled": True, "Default": False}}},
          "children": [{"role": "icon", "match": "nested icon copy, any layer name"}, {"role": "label", "match": "text layer"}],
          "defaults": {"variant": "default", "size": "default", "disabled": False}},
  "Tag": {"v": 3, "package": PKG, "export": "Badge",
          "props": {"variant": {"from": "Style", "map": inv(TAG_STYLE)}},
          "children": [{"role": "label", "match": "text layer"}], "defaults": {"variant": "default"}},
  "Panel": {"v": 3, "package": PKG, "export": "Card",
            "parts": {v: k for k, v in PARTS.items()},
            "slots": {"Body": "single child of the part (whatever was swapped in)", "Actions": "single child of the part (whatever was swapped in)"},
            "rules": ["A layer named after a part renders as that part's export.", "A text part takes its text as children.",
                      "A slot renders its single child: a linked copy by its own link, an unlinked local component by rendering its children. A slot still holding the placeholder is omitted."]},
}
def walk(n):
    comp = n.get("component")
    if comp and comp["library"] == "Library":
        name = comp["name"]
        if name == "Button":
            vp = n["variantProps"]; comp["name"] = n["name"] = "CTA"
            n["variantProps"] = {"Type": BTN_TYPE[vp["variant"]], "Size": BTN_SIZE[vp["size"]], "State": vp["state"]}
            n["link"] = LINKS["CTA"]
        elif name == "Badge":
            comp["name"] = n["name"] = "Tag"; n["variantProps"] = {"Style": TAG_STYLE[n["variantProps"]["variant"]]}; n["link"] = LINKS["Tag"]
        elif name == "Card":
            comp["name"] = n["name"] = "Panel"; n["link"] = LINKS["Panel"]
        elif name in ICONS:
            comp["name"] = n["name"] = ICONS[name]; comp["path"] = "icons"
            n["link"] = {"v": 3, "package": PKG, "export": f"icons.{name}", "kind": "icon"}
            n.pop("children", None)
    elif n["name"] in PARTS:
        n["name"] = PARTS[n["name"]]
    if n.get("name") == "Label": n["name"] = "txt"
    for c in n.get("children", []): walk(c)
walk(d)
json.dump(d, open(f"{out_dir}/screen.designer.with-link.json", "w"), indent=1)
def strip(n):
    n.pop("link", None)
    for c in n.get("children", []): strip(c)
strip(d)
json.dump(d, open(f"{out_dir}/screen.designer.no-link.json", "w"), indent=1)
