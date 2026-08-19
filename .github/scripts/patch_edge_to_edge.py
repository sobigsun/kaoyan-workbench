#!/usr/bin/env python3
"""
原生层 Edge-to-Edge 适配兜底脚本
===================================
给 Capacitor 生成的 Android 项目打补丁，让状态栏/导航栏背景透明，
内容可以绘制到刘海/挖孔区域，配合前端 safe-area padding 避免重叠。

运行：python3 .github/scripts/patch_edge_to_edge.py [--android-root ./android]

幂等设计：重复执行不会重复插入 item。
"""

import argparse
import os
import shutil
import sys


def patch_styles_xml(path: str) -> bool:
    """给 styles.xml 的 AppTheme.NoActionBar 追加 edge-to-edge item。返回是否实际修改。"""
    if not os.path.isfile(path):
        print(f"[skip] styles.xml 不存在: {path}")
        return False
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    items_noactionbar = [
        '<item name="android:statusBarColor">@android:color/transparent</item>',
        '<item name="android:navigationBarColor">@android:color/transparent</item>',
        '<item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>',
        '<item name="android:enforceNavigationBarContrast">false</item>',
        '<item name="android:enforceStatusBarContrast">false</item>',
    ]
    items_splash = [
        '<item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>',
    ]

    def ensure_items(block_marker: str, items):
        nonlocal content
        idx = content.find(block_marker)
        if idx == -1:
            return
        end_tag_idx = content.find("</style>", idx)
        if end_tag_idx == -1:
            return
        block = content[idx:end_tag_idx]
        changed = False
        for it in items:
            if it not in block:
                block = block.rstrip() + "\n        " + it + "\n    "
                changed = True
        if changed:
            content = content[:idx] + block + content[end_tag_idx:]

    ensure_items('parent="Theme.AppCompat.DayNight.NoActionBar">', items_noactionbar)
    ensure_items('parent="Theme.SplashScreen">', items_splash)

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"[ok] styles.xml 已打补丁: {path}")
    return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--android-root", default="android")
    args = parser.parse_args()

    root = args.android_root

    # 1) 主 styles.xml
    styles = os.path.join(root, "app/src/main/res/values/styles.xml")
    if patch_styles_xml(styles):
        # 1.5) 夜间模式同样复制一份（如果已存在）
        night_styles = os.path.join(root, "app/src/main/res/values-night/styles.xml")
        if os.path.isfile(night_styles) and os.path.isfile(styles):
            try:
                shutil.copyfile(styles, night_styles)
                print(f"[ok] 已同步夜间模式 styles.xml: {night_styles}")
            except OSError as e:
                print(f"[warn] 同步夜间模式 styles.xml 失败: {e}")

    # 2) AndroidManifest：目前无需修改，保留占位以便未来扩展
    manifest = os.path.join(root, "app/src/main/AndroidManifest.xml")
    if os.path.isfile(manifest):
        print(f"[ok] manifest 存在，无需额外改动: {manifest}")

    print("--- Native edge-to-edge patch done ---")
    return 0


if __name__ == "__main__":
    sys.exit(main())
