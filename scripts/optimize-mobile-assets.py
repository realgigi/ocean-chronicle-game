from pathlib import Path
from shutil import copy2
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public" / "assets"
MOBILE = PUBLIC / "mobile"


def save_webp(src: Path, dest: Path, max_size: tuple[int, int], quality: int = 78) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    img = Image.open(src)
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGBA" if "A" in img.getbands() else "RGB")
    img.thumbnail(max_size, Image.Resampling.LANCZOS)
    img.save(dest, "WEBP", quality=quality, method=6)


def save_png(src: Path, dest: Path, max_size: tuple[int, int]) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    img = Image.open(src)
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    img.thumbnail(max_size, Image.Resampling.LANCZOS)
    img.save(dest, "PNG", optimize=True)


def main() -> None:
    conversions = [
        ("ui/game-cover.png", "ui/game-cover.webp", (720, 1280), 80),
        ("generated/icons/double-band-samurai-portrait-v01.png", "icons/double-band-samurai-portrait-v01.webp", (320, 320), 82),
        ("generated/stages/north-battlefield-bg-v01.png", "stages/north-battlefield-bg-v01.webp", (720, 1280), 80),
        ("cutins/heroes/double-band-samurai-core-breaker-v01.png", "cutins/double-band-samurai-core-breaker-v01.webp", (720, 1280), 78),
        ("cutins/bosses/giant-garbage-anemone-tentacle-sweep-v01.png", "cutins/giant-garbage-anemone-tentacle-sweep-v01.webp", (720, 1280), 78),
        ("cutins/bosses/giant-garbage-anemone-toxic-core-v01.png", "cutins/giant-garbage-anemone-toxic-core-v01.webp", (720, 1280), 78),
        ("pickups/ocean-light-energy-v01.png", "pickups/ocean-light-energy-v01.webp", (96, 96), 82),
        ("characters/ancient_gods/shark-war-god-statue.png", "victory/shark-war-god-statue.webp", (720, 720), 78),
    ]

    for state in ("idle", "sweep", "core", "hit"):
        conversions.append((
            f"generated/bosses/cropped/giant-garbage-anemone-{state}-v01.png",
            f"bosses/giant-garbage-anemone-{state}-v01.webp",
            (520, 520),
            78,
        ))

    for src in sorted((PUBLIC / "posters" / "characters").glob("*.png")):
        conversions.append((
            str(src.relative_to(PUBLIC)),
            f"posters/{src.stem}.webp",
            (540, 960),
            76,
        ))

    for src in sorted((PUBLIC / "cards" / "prototypes").glob("*-picture-card-v01.png")):
        conversions.append((
            str(src.relative_to(PUBLIC)),
            f"cards/{src.stem}.webp",
            (360, 540),
            76,
        ))

    for src_rel, dest_rel, size, quality in conversions:
        save_webp(PUBLIC / src_rel, MOBILE / dest_rel, size, quality)

    host_assets = [
        ("hosts/red-geisha-host-v01.png", "hosts/red-geisha-host-v01.png", (260, 360)),
        ("hosts/snow-seal-mage-setting-cutout-v01.png", "hosts/snow-seal-mage-setting-cutout-v01.png", (240, 340)),
        ("hosts/silverback-assault-setting-cutout-v01.png", "hosts/silverback-assault-setting-cutout-v01.png", (240, 340)),
        ("hosts/black-panther-ninja-setting-cutout-v01.png", "hosts/black-panther-ninja-setting-cutout-v01.png", (240, 340)),
        ("hosts/tomato-ronin-setting-cutout-v01.png", "hosts/tomato-ronin-setting-cutout-v01.png", (240, 340)),
        ("hosts/whale-shark-reincarnation-cutout-v01.png", "hosts/whale-shark-reincarnation-cutout-v01.png", (250, 350)),
        ("hosts/parrotfish-warrior-setting-cutout-v01.png", "hosts/parrotfish-warrior-setting-cutout-v01.png", (240, 340)),
        ("hosts/napoleon-wrasse-warrior-setting-cutout-v01.png", "hosts/napoleon-wrasse-warrior-setting-cutout-v01.png", (240, 340)),
        ("hosts/moray-strategist-setting-cutout-v01.png", "hosts/moray-strategist-setting-cutout-v01.png", (240, 340)),
        ("icons/prince-clownfish-circle-v01.png", "icons/prince-clownfish-circle-v01.png", (260, 260)),
    ]
    for src_rel, dest_rel, size in host_assets:
        save_png(PUBLIC / src_rel, MOBILE / dest_rel, size)

    video_conversions = [
        ("videos/start-game-intro.mp4", "videos/start-game-intro.mp4"),
        ("videos/north-border-intro.mp4", "videos/north-border-intro.mp4"),
        ("videos/coral-old-street-intro.mp4", "videos/coral-old-street-intro.mp4"),
        ("videos/ice-crystal-castle-intro.mp4", "videos/ice-crystal-castle-intro.mp4"),
        ("videos/dark-current-field-intro.mp4", "videos/dark-current-field-intro.mp4"),
        ("videos/snowfield-highland-intro.mp4", "videos/snowfield-highland-intro.mp4"),
        ("videos/tide-tribe-intro.mp4", "videos/tide-tribe-intro.mp4"),
        ("videos/abyss-tower-intro.mp4", "videos/abyss-tower-intro.mp4"),
    ]
    for src_rel, dest_rel in video_conversions:
        dest = MOBILE / dest_rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        copy2(PUBLIC / src_rel, dest)

    total = sum(path.stat().st_size for path in MOBILE.rglob("*") if path.is_file())
    print(f"Optimized mobile assets: {total / 1024 / 1024:.2f} MB")


if __name__ == "__main__":
    main()
