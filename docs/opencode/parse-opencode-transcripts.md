# 解析 OpenCode 对话记录（本地）

目的

- 说明如何在本地查找、导出并解析 OpenCode 的会话/对话记录，侧重安全地读取 SQLite 存储并重构人类可读的转录。

注意（隐私与安全）

- 本文档使用通用占位符 LocalData 表示本机用户数据目录。请勿把实际的用户主目录或未脱敏的数据库文件上传到公共网络。
- 在操作前先备份数据库文件并在副本上执行导出与解析。

本地数据布局（概念）

- Windows 示例（占位符）：
  - LocalData\opencode\opencode.db ← 主 SQLite 数据库（首选）
  - LocalData\opencode\storage\session*diff\ses*\*.json ← 补丁/变更快照（不是主消息库）
  - LocalData\opencode\log\*.log
- POSIX 示例（占位符）：
  - LocalData/opencode/opencode.db
  - LocalData/opencode/storage/session*diff/ses*\*.json

关键表概览

- session: 会话元信息（id, title, directory, time_created 等）
- message: 消息主表（id, session_id, time_created, time_updated, data）
- part: 消息分段（id, message_id, session_id, data），data 通常是 JSON 字符串，type 常见为 text
- session_entry / session_share / event: 其它辅助表

数据样例（已脱敏）

- message.data（TEXT，通常为 JSON 字符串）示例：

```
{"role":"assistant","time":{"created":1630000000000,"completed":1630000000123},"modelID":"glm-4.7","finish":"stop"}
```

- part.data（TEXT，通常为 JSON）示例：

```
{"type":"text","text":"这里是一段助手回复的文本，可能包含代码或说明。"}
```

为什么不要只看 session_diff

- storage/session*diff 下的 ses*\*.json 文件保存的是文件变更（patch）记录，里面可能包含 README、SKILL.md 等文件片段。
- 这些补丁中偶尔会出现像 `<promise>...</promise>` 的文本，导致在补丁中搜索标签会产生误报。
- 正确的消息/对话来源是 opencode.db 中的 message/part 表。

快速步骤（推荐、稳妥）

1. 备份数据库：复制 LocalData/opencode/opencode.db 到安全位置，后续所有操作基于副本。
2. 使用 Python（推荐）或 sqlite3 CLI 打开并检查表结构。
3. 从 message 表按时间顺序读取消息；对每条消息查询其对应的 part 表记录以重建完整文本流。
4. 在导出前做脱敏：移除或替换字段中可能携带的本地路径（如 path.cwd、path.root、directory 等）。

示例：用 Python 重建会话转录（最小示例）

```python
"""
用法（占位符）:
  python reconstruct_transcript.py --db "LocalData/opencode/opencode.db" --session ses_xxx --out out.json
"""
import sqlite3
import json
from datetime import datetime
import argparse

def sanitize_obj(o):
    # 简单脱敏：删除常见路径字段
    if isinstance(o, dict):
        return {k: sanitize_obj(v) for k, v in o.items() if k.lower() not in ("path","cwd","root","directory","home")}
    if isinstance(o, list):
        return [sanitize_obj(x) for x in o]
    return o

def to_iso(ms):
    try:
        return datetime.fromtimestamp(ms/1000).isoformat()
    except Exception:
        return None

def reconstruct(db_path, session_id, out_path):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    transcript = {"session_id": session_id, "messages": []}

    q = "SELECT id,time_created,time_updated,data FROM message WHERE session_id=? ORDER BY time_created ASC"
    for r in cur.execute(q, (session_id,)):
        mid = r["id"]
        data = r["data"]
        role = None
        text_candidates = []
        try:
            jd = json.loads(data)
            role = jd.get("role")
            # 常见字段优先
            for k in ("text","body","content","summary","message"):
                v = jd.get(k)
                if v:
                    text_candidates.append(v)
        except Exception:
            # 非 JSON 字符串 -> 原样保留
            text_candidates.append(str(data))

        parts = []
        for p in cur.execute("SELECT id,time_created,data FROM part WHERE message_id=? ORDER BY time_created ASC", (mid,)):
            pdata = p["data"]
            ptext = None
            try:
                pjd = json.loads(pdata)
                if isinstance(pjd, dict) and pjd.get("type") == "text":
                    ptext = pjd.get("text")
                else:
                    ptext = json.dumps(sanitize_obj(pjd), ensure_ascii=False)
            except Exception:
                ptext = str(pdata)
            parts.append({"id": p["id"], "time_created": p["time_created"], "text": ptext})

        if not text_candidates:
            # 拼接 parts
            msg_text = "\n".join([p["text"] for p in parts if p.get("text")])
        else:
            msg_text = "\n".join([str(x) for x in text_candidates])

        transcript["messages"].append({
            "id": mid,
            "role": role,
            "time_created": r["time_created"],
            "time_updated": r["time_updated"],
            "time_iso": to_iso(r["time_created"]),
            "text": msg_text,
            "parts": parts
        })

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(transcript, f, ensure_ascii=False, indent=2)
    conn.close()

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", required=True)
    ap.add_argument("--session", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    reconstruct(args.db, args.session, args.out)
```

在数据库中查找包含特定标记（例如 <promise>）的条目

- SQL 示例（大小写不敏感）：

```
SELECT id, session_id, data FROM part WHERE lower(data) LIKE '%<promise>%';
SELECT id, session_id, data FROM message WHERE lower(data) LIKE '%<promise>%';
```

- Python 中可用 json.loads 解析 data 字段并提取标签内容（参考上面 reconstruct 脚本做二次处理）。

导出格式建议

- JSON: per-session JSON（便于后续程序化处理）
- NDJSON: 每行一个消息，适合流式导出/导入工具
- Markdown: 人类可读报告（按时间顺序列出 role/timestamp/text），可在审阅时删除敏感路径

编码与大文件注意事项

- 使用 Python 的 sqlite3 可以避免缺少 sqlite3 CLI 的问题。
- 在写入控制台时可能遇到编码问题（Windows 控制台），建议把结果写入 UTF-8 文件并用编辑器打开。
- 对于非常大的会话，分批处理（LIMIT / OFFSET 或按时间窗口）以减少内存占用。

常见问题与排查

- 找不到 opencode.db：确认 LocalData 路径，或搜索 LocalData/opencode 目录。
- message.data 不是 JSON：有少量记录可能为原始字符串，脚本应容错并把原始内容作为回退。
- session_diff 中出现的文本片段不是消息：它们可能来自文件补丁（patch），不是主消息存储。

操作清单（复核）

1. 备份 LocalData/opencode/opencode.db
2. 用脚本或 sqlite3 列出表并确认 message/part/session 存在
3. 按会话导出并在导出步骤进行脱敏
4. 如需共享，先删除或替换本地路径和可能的 PII

参考

- message / part 表结构：message(id, session_id, time_created, time_updated, data)，part(id, message_id, session_id, time_created, time_updated, data)

如果需要，我可以：

1. 帮你把某个 session 导出为 JSON/NDJSON/Markdown（你只需给我 session id 或 title），
2. 或把上面的脚本提炼为可执行的小工具并放入仓库的 scripts/ 目录。
