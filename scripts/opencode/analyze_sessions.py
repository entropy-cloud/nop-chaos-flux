#!/usr/bin/env python3
"""
Analyze OpenCode sessions for token usage, tool calls, search/edit patterns and durations.

This script avoids embedding real user home directories; use the --db CLI argument to point to your local DB.

Example:
  python scripts/opencode/analyze_sessions.py --db "C:/Users/you/.local/share/opencode/opencode.db" --out /tmp/opencode_session_analysis.json
"""
import sqlite3
import json
import os
import re
import sys
import argparse


def sanitize(s):
    if s is None:
        return s
    s = str(s)
    # Replace common local home paths with a placeholder
    return re.sub(r"C:\\\\Users\\\\[^\\\\/]+|C:/Users/[^/]+|/home/[^/]+", "LocalData", s)


search_cmd_re = re.compile(r"\b(rg|ripgrep|grep|git\s+grep|fd|find)\b", re.I)
edit_cmd_re = re.compile(r"\b(apply_patch|git\s+apply|git\s+am|patch|sed\s+-i|ed -s|ed)\b", re.I)


def to_int(v):
    try:
        return int(v)
    except Exception:
        return None


def analyze(db_path, out_path):
    if not os.path.exists(db_path):
        print("ERROR: DB not found:", db_path, file=sys.stderr)
        sys.exit(2)

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    sessions = cur.execute('SELECT id,title,directory,time_created,time_updated FROM session').fetchall()
    analysis = {'sessions': {}, 'summary': {}}

    for s in sessions:
        sid = s['id']
        title = sanitize(s['title'] or '')
        directory = sanitize(s['directory'] or '')
        sess = {
            'id': sid,
            'title': title,
            'directory': directory,
            'time_created': to_int(s['time_created']),
            'time_updated': to_int(s['time_updated']),
            'messages_count': 0,
            'parts_count': 0,
            'tool_calls': 0,
            'bash_calls': 0,
            'search_calls': 0,
            'edit_calls': 0,
            'tokens_sum': 0,
            'tokens_from_messages': 0,
            'tokens_from_parts': 0,
            'total_message_duration_ms': 0,
            'wall_clock_span_ms': 0,
            'commands': {},
            'files_edited': {},
            'messages': [],
        }

        msgs = cur.execute('SELECT id,time_created,time_updated,data FROM message WHERE session_id=? ORDER BY time_created ASC', (sid,)).fetchall()
        if not msgs:
            analysis['sessions'][sid] = sess
            continue

        sess['messages_count'] = len(msgs)
        first_time = None
        last_time = None

        for m in msgs:
            mid = m['id']
            mrec = {
                'id': mid,
                'time_created': to_int(m['time_created']),
                'time_updated': to_int(m['time_updated']),
                'role': None,
                'tokens': 0,
                'duration_ms': None,
                'has_parts': False,
            }
            if first_time is None or (mrec['time_created'] is not None and mrec['time_created'] < first_time):
                first_time = mrec['time_created']
            if last_time is None or (mrec['time_updated'] is not None and mrec['time_updated'] > last_time):
                last_time = mrec['time_updated']

            data = m['data']
            try:
                jd = json.loads(data)
            except Exception:
                jd = None

            if isinstance(jd, dict):
                mrec['role'] = jd.get('role')
                toks = 0
                if 'tokens' in jd and isinstance(jd['tokens'], dict):
                    for k in ('input', 'output', 'reasoning', 'total'):
                        v = jd['tokens'].get(k)
                        if isinstance(v, (int, float)):
                            toks += int(v)
                elif isinstance(jd.get('tokens'), (int, float)):
                    toks += int(jd.get('tokens'))
                mrec['tokens'] = toks
                sess['tokens_sum'] += toks
                sess['tokens_from_messages'] += toks

                if isinstance(jd.get('time'), dict):
                    tc = jd['time'].get('created')
                    tp = jd['time'].get('completed')
                    if isinstance(tc, (int, float)) and isinstance(tp, (int, float)) and tp >= tc:
                        dur = int(tp - tc)
                        mrec['duration_ms'] = dur
                        sess['total_message_duration_ms'] += dur

                if 'summary' in jd and isinstance(jd['summary'], dict):
                    diffs = jd['summary'].get('diffs')
                    if isinstance(diffs, list):
                        for d in diffs:
                            fname = d.get('file')
                            if fname:
                                fn = sanitize(fname)
                                sess['files_edited'][fn] = sess['files_edited'].get(fn, 0) + 1

            parts = cur.execute('SELECT id,message_id,session_id,time_created,time_updated,data FROM part WHERE message_id=? ORDER BY time_created ASC', (mid,)).fetchall()
            if parts:
                mrec['has_parts'] = True

            for p in parts:
                sess['parts_count'] += 1
                pdata = p['data']
                try:
                    pjd = json.loads(pdata)
                except Exception:
                    pjd = None

                if isinstance(pjd, dict) and 'tokens' in pjd and isinstance(pjd['tokens'], dict):
                    toks = 0
                    for k in ('input', 'output', 'reasoning', 'total'):
                        v = pjd['tokens'].get(k)
                        if isinstance(v, (int, float)):
                            toks += int(v)
                    sess['tokens_sum'] += toks
                    sess['tokens_from_parts'] += toks
                    mrec['tokens'] += toks

                tool_name = None
                cmd = None
                if isinstance(pjd, dict):
                    if 'tool' in pjd:
                        tool_name = pjd.get('tool')
                    if pjd.get('type') == 'tool' and not tool_name:
                        tool_name = pjd.get('tool')
                    state = pjd.get('state')
                    if isinstance(state, dict):
                        inp = state.get('input')
                        if isinstance(inp, dict):
                            cmd = inp.get('command') or inp.get('args') or inp.get('script')
                        meta = state.get('metadata')
                        if not cmd and isinstance(meta, dict):
                            cmd = meta.get('description')

                    if 'type' in pjd and pjd.get('type') == 'text' and isinstance(pjd.get('text'), str):
                        t = pjd.get('text')
                        if 'Index: ' in t or '\n@@ ' in t or '+++ ' in t:
                            for mfn in re.findall(r"Index: ([^\r\n]+)", t):
                                fn = sanitize(mfn.strip())
                                sess['files_edited'][fn] = sess['files_edited'].get(fn, 0) + 1

                if tool_name:
                    sess['tool_calls'] += 1
                    tn = sanitize(str(tool_name).lower())
                    if tn not in sess['commands']:
                        sess['commands'][tn] = {'count': 0, 'examples': {}}
                    sess['commands'][tn]['count'] += 1
                    if cmd:
                        cmd_s = sanitize(cmd).strip()
                        if len(cmd_s) > 1000:
                            cmd_s = cmd_s[:1000] + '...'
                        sess['commands'][tn]['examples'][cmd_s] = sess['commands'][tn]['examples'].get(cmd_s, 0) + 1
                        if search_cmd_re.search(cmd_s):
                            sess['search_calls'] += 1
                        if edit_cmd_re.search(cmd_s) or 'patch' in cmd_s or 'Index: ' in (cmd_s or ''):
                            sess['edit_calls'] += 1
                    if tn in ('bash', 'sh', 'powershell'):
                        sess['bash_calls'] += 1
                else:
                    if isinstance(pjd, dict):
                        txt = ' '
                        for k in ('text', 'output', 'snapshot', 'description'):
                            v = pjd.get(k)
                            if isinstance(v, str):
                                txt += ' ' + v
                        if search_cmd_re.search(txt):
                            sess['search_calls'] += 1
                        if edit_cmd_re.search(txt) or 'Index: ' in txt or '\n@@ ' in txt:
                            sess['edit_calls'] += 1

            sess['messages'].append(mrec)

        if first_time is not None and last_time is not None:
            try:
                sess['wall_clock_span_ms'] = int(last_time - first_time)
            except Exception:
                sess['wall_clock_span_ms'] = None

        cmd_summary = []
        for tn, info in sess['commands'].items():
            top_examples = sorted(info['examples'].items(), key=lambda x: -x[1])[:3]
            cmd_summary.append({'tool': tn, 'count': info['count'], 'top_examples': [{'cmd': k, 'count': v} for k, v in top_examples]})
        sess['top_commands'] = sorted(cmd_summary, key=lambda x: -x['count'])[:10]
        sess['top_files'] = sorted([{'file': k, 'count': v} for k, v in sess['files_edited'].items()], key=lambda x: -x['count'])[:20]
        sess['messages_sample'] = [{'id': m['id'], 'role': m['role'], 'time_created': m['time_created'], 'tokens': m['tokens'], 'duration_ms': m['duration_ms'], 'has_parts': m['has_parts']} for m in sess['messages'][:10]]
        del sess['messages']
        analysis['sessions'][sid] = sess

    all_sess = list(analysis['sessions'].values())
    analysis['summary']['total_sessions'] = len(all_sess)
    analysis['summary']['total_messages'] = sum(s.get('messages_count', 0) for s in all_sess)
    analysis['summary']['total_parts'] = sum(s.get('parts_count', 0) for s in all_sess)
    analysis['summary']['total_tool_calls'] = sum(s.get('tool_calls', 0) for s in all_sess)
    analysis['summary']['total_tokens'] = sum(s.get('tokens_sum', 0) for s in all_sess)
    analysis['summary']['top_sessions_by_tokens'] = sorted(all_sess, key=lambda x: -x.get('tokens_sum', 0))[:10]
    analysis['summary']['top_sessions_by_wall_clock'] = sorted(all_sess, key=lambda x: -(x.get('wall_clock_span_ms') or 0))[:10]

    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(analysis, f, ensure_ascii=False, indent=2)
    conn.close()
    print('WROTE', out_path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--db', required=True, help='Path to opencode.db')
    ap.add_argument('--out', required=False, default=os.path.join(os.path.expanduser('~'), 'AppData', 'Local', 'Temp', 'opencode_session_analysis.json'), help='Output JSON path')
    args = ap.parse_args()
    analyze(args.db, args.out)


if __name__ == '__main__':
    main()
