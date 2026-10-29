"""Extract the exact claim text and FIG. 1 from the Form 2 complete specification.

Usage:
  python3 -I scripts/extract-claims.py           # write content/claims.json + public/fig/fig1.png
  python3 -I scripts/extract-claims.py --check   # fail if the docx no longer matches content/claims.json

The on-screen claim text is rendered only from content/claims.json, so the video can never
drift from the filed wording without this check failing.
"""
import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
DOCX = next(REPO.glob("FORM 02_*.docx"))
OUT_JSON = ROOT / "content" / "claims.json"
OUT_FIG = ROOT / "public" / "fig" / "fig1.png"

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

# Claims 2-17 begin with "The system (100) according to claim N"; claim 6 in the filed
# document starts with a stray "T " which is reported (not silently hidden) below.
DEPENDENT = re.compile(r"^(?P<stray>T\s+)?The system \(100\) according to claim (?P<parent>\d+)")
METHOD = re.compile(r"^A method \(200\)")


def paragraphs(docx: Path) -> list[str]:
    root = ET.fromstring(zipfile.ZipFile(docx).read("word/document.xml"))
    out = []
    for p in root.iter(f"{W}p"):
        text = "".join(t.text or "" for t in p.iter(f"{W}t"))
        text = re.sub(r"\s+", " ", text).strip()
        if text:
            out.append(text)
    return out


def extract() -> dict:
    paras = paragraphs(DOCX)
    title = paras[paras.index("TITLE OF THE INVENTION") + 1].strip("“”\"")
    start = paras.index("WE CLAIM:") + 1
    end = paras.index("ABSTRACT")

    claims: list[dict] = []
    fixes: list[str] = []
    for text in paras[start:end]:
        dep = DEPENDENT.match(text)
        if dep:
            if dep.group("stray"):
                fixes.append(f"Claim {len(claims) + 1}: removed stray leading '{dep.group('stray').strip()}' before 'The system (100)'")
                text = text[dep.end("stray"):]
            claims.append({"n": len(claims) + 1, "kind": "system", "dependsOn": int(dep.group("parent")), "paragraphs": [text]})
        elif METHOD.match(text):
            claims.append({"n": len(claims) + 1, "kind": "method", "dependsOn": None, "paragraphs": [text]})
        elif not claims:
            claims.append({"n": 1, "kind": "system", "dependsOn": None, "paragraphs": [text]})
        else:
            claims[-1]["paragraphs"].append(text)

    for c in claims:
        c["text"] = " ".join(c["paragraphs"])
        c["words"] = len(c["text"].split())

    if len(claims) != 18:
        sys.exit(f"Expected 18 claims, found {len(claims)}")

    return {"title": title, "source": DOCX.name, "textFixes": fixes, "claims": claims}


def main() -> None:
    data = extract()
    if "--check" in sys.argv:
        current = json.loads(OUT_JSON.read_text())
        if current != data:
            sys.exit("content/claims.json no longer matches the docx; re-run without --check")
        print("claims.json matches the docx")
        return

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")

    OUT_FIG.parent.mkdir(parents=True, exist_ok=True)
    OUT_FIG.write_bytes(zipfile.ZipFile(DOCX).read("word/media/image1.png"))

    print(f"Title: {data['title']}")
    for c in data["claims"]:
        dep = f"claim {c['dependsOn']}" if c["dependsOn"] else "independent"
        print(f"  Claim {c['n']:>2} ({c['kind']}, {dep}): {c['words']} words")
    for f in data["textFixes"]:
        print(f"  NOTE {f}")


if __name__ == "__main__":
    main()
