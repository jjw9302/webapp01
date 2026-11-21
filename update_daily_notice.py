#!/usr/bin/env python3
"""매일 1회 (09:00 KST) 오늘의 테트리스 알림 메시지(data/daily_notice.json)를 갱신합니다."""
import datetime
import json
from pathlib import Path

KST = datetime.timezone(datetime.timedelta(hours=9))
OUT = Path(__file__).resolve().parent / "data" / "daily_notice.json"

MESSAGES = [
    ("🧱 오늘의 테트리스 한 판!", "잠깐 머리 식히며 오늘 목표 {target:,}점에 도전해 보세요."),
    ("🔥 일일 테트리스 챌린지", "오늘의 목표 점수는 {target:,}점! 4줄 클리어(테트리스)에 도전하세요."),
    ("⚡ 두뇌 회전 타임!", "하루 3분 테트리스로 집중력 UP! 목표 {target:,}점 달성해 볼까요?"),
    ("🏆 최고 기록 경신 도전", "어제보다 높은 점수를 노려보세요. 오늘의 추천 목표: {target:,}점"),
    ("🎯 오늘의 블록 퍼즐", "차분하게 쌓고 한 번에 정리! {target:,}점 클리어에 도전하세요."),
]


def main():
    now = datetime.datetime.now(KST)
    day_idx = now.toordinal()
    title, body_tpl = MESSAGES[day_idx % len(MESSAGES)]
    target = 1000 + ((day_idx % 5) * 500)
    payload = {
        "date": now.strftime("%Y-%m-%d"),
        "title": title,
        "body": body_tpl.format(target=target),
        "targetScore": target,
        "updatedAt": now.strftime("%Y-%m-%d %H:%M:%S KST"),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Updated daily_notice.json:", payload["date"], payload["title"])


if __name__ == "__main__":
    main()
