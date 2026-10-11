import os
import re
import json
import base64
import zipfile
import io

base_dir = os.path.dirname(os.path.abspath(__file__))
folders = ['CMT', 'orderFulFilmentChecklist', 'orderFulfilment', 'superadmin']

def clean_text(t):
    if not t:
        return ""
    ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
    return ansi_escape.sub('', str(t)).strip()

def natural_sort_key(s):
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', s)]

def parse_error(err):
    if not err:
        return None
    if isinstance(err, str):
        return {'message': clean_text(err), 'stack': ''}
    elif isinstance(err, dict):
        return {
            'message': clean_text(err.get('message', '')),
            'stack': clean_text(err.get('stack', ''))
        }
    return {'message': clean_text(str(err)), 'stack': ''}

def process_step(s, report_rel_path, data_att_map):
    title = clean_text(s.get('title', ''))
    duration = s.get('duration', 0)
    count = s.get('count', 1)
    error = parse_error(s.get('error'))
    
    # Check attachments for this step
    attachments = []
    for att_idx in s.get('attachments', []):
        if att_idx in data_att_map:
            att_info = data_att_map[att_idx]
            attachments.append(att_info)

    child_steps = []
    for child in s.get('steps', []):
        child_steps.append(process_step(child, report_rel_path, data_att_map))

    return {
        'title': title,
        'duration': duration,
        'count': count,
        'error': error,
        'attachments': attachments,
        'steps': child_steps
    }

def get_subfolder_name(rel_path, folder):
    parts = rel_path.replace('\\', '/').split('/')
    # If folder is 'orderFulFilmentChecklist' and case is top level
    if folder == 'orderFulFilmentChecklist':
        if len(parts) > 2 and parts[1] == 'case-001-020':
            return 'case-001-020'
        else:
            return 'case-021-049'
    elif len(parts) > 2:
        return parts[1]
    return 'General'

def generate():
    print(f"Scanning base directory: {base_dir}")
    all_reports = []
    folder_stats = {}

    for folder in folders:
        folder_stats[folder] = {'total': 0, 'passed': 0, 'failed': 0, 'duration': 0}
        folder_path = os.path.join(base_dir, folder)
        if not os.path.exists(folder_path):
            print(f"Warning: Folder not found: {folder_path}")
            continue

        # Find all index.html files
        walk_results = []
        for root, dirs, files in os.walk(folder_path):
            if 'index.html' in files:
                walk_results.append((root, files))

        # Sort paths with natural numerical sorting (case001 before case020, etc.)
        walk_results.sort(key=lambda x: natural_sort_key(x[0]))

        for root, files in walk_results:
            rel_dir = os.path.relpath(root, base_dir).replace('\\', '/')
            html_path = os.path.join(root, 'index.html')
            
            with open(html_path, 'r', encoding='utf-8', errors='ignore') as f:
                html = f.read()

            m = re.search(r'<template id="playwrightReportBase64">\s*data:application/zip;base64,([^<]+)</template>', html)
            report_json = {}
            test_files_data = {}
            if m:
                try:
                    b64_str = m.group(1).strip()
                    raw_data = base64.b64decode(b64_str)
                    zf = zipfile.ZipFile(io.BytesIO(raw_data))
                    for fname in zf.namelist():
                        if fname == 'report.json':
                            report_json = json.loads(zf.read(fname).decode('utf-8'))
                        elif fname.endswith('.json'):
                            test_files_data[fname] = json.loads(zf.read(fname).decode('utf-8'))
                except Exception as e:
                    print(f"Error parsing zip in {rel_dir}: {e}")

            screenshots_dir = os.path.join(root, 'screenshots')
            videos_dir = os.path.join(root, 'videos')
            
            screenshot_files = []
            if os.path.isdir(screenshots_dir):
                for sf in sorted(os.listdir(screenshots_dir), key=natural_sort_key):
                    if sf.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                        screenshot_files.append({
                            'name': sf,
                            'path': f"{rel_dir}/screenshots/{sf}"
                        })

            video_files = []
            if os.path.isdir(videos_dir):
                for vf in sorted(os.listdir(videos_dir), key=natural_sort_key):
                    if vf.lower().endswith(('.webm', '.mp4', '.mkv')):
                        video_files.append({
                            'name': vf,
                            'path': f"{rel_dir}/videos/{vf}"
                        })

            # Check status and parse test details
            status = 'passed'
            spec_file = ''
            test_title = os.path.basename(rel_dir)
            duration = 0
            start_time = ''
            errors = []
            steps = []
            attachments_list = []
            data_att_map = {}

            if report_json:
                rep_stats = report_json.get('stats', {})
                if rep_stats.get('unexpected', 0) > 0 or not rep_stats.get('ok', True):
                    status = 'failed'
                if report_json.get('duration'):
                    duration = report_json.get('duration')
                if report_json.get('startTime'):
                    start_time = report_json.get('startTime')

            if test_files_data:
                for tf_id, tf_data in test_files_data.items():
                    spec_file = tf_data.get('fileName', spec_file)
                    for t in tf_data.get('tests', []):
                        test_title = t.get('title', test_title)
                        if t.get('outcome') != 'expected' or not t.get('ok', True):
                            status = 'failed'
                        for res in t.get('results', []):
                            if res.get('duration'):
                                duration = res.get('duration')
                            if res.get('startTime'):
                                start_time = res.get('startTime')
                            if res.get('status') not in ['passed', 'expected']:
                                status = 'failed'
                            if res.get('error'):
                                err_obj = parse_error(res['error'])
                                if err_obj:
                                    errors.append(err_obj)
                            if res.get('errors'):
                                for err in res['errors']:
                                    err_obj = parse_error(err)
                                    if err_obj:
                                        errors.append(err_obj)
                            
                            # Attachments
                            for idx, att in enumerate(res.get('attachments', [])):
                                att_name = att.get('name', f'attachment_{idx}')
                                att_path = att.get('path', '')
                                att_type = att.get('contentType', '')
                                full_att_path = f"{rel_dir}/{att_path}" if att_path else ""
                                
                                matched_screenshot = None
                                if screenshot_files:
                                    for sf in screenshot_files:
                                        if att_name.lower() in sf['name'].lower() or sf['name'].lower().replace('.png', '').endswith(att_name.lower()):
                                            matched_screenshot = sf['path']
                                            break

                                att_obj = {
                                    'name': att_name,
                                    'contentType': att_type,
                                    'path': full_att_path,
                                    'matched_screenshot': matched_screenshot or full_att_path
                                }
                                attachments_list.append(att_obj)
                                data_att_map[idx] = att_obj

                                if att_type.startswith('video/') and not video_files:
                                    video_files.append({
                                        'name': att_name,
                                        'path': full_att_path
                                    })

                            # Steps
                            raw_steps = res.get('steps', [])
                            for st in raw_steps:
                                steps.append(process_step(st, rel_dir, data_att_map))

            # Fallback if no videos found in videos_dir
            if not video_files:
                data_dir = os.path.join(root, 'data')
                if os.path.isdir(data_dir):
                    for df in sorted(os.listdir(data_dir), key=natural_sort_key):
                        if df.endswith('.webm'):
                            video_files.append({
                                'name': df,
                                'path': f"{rel_dir}/data/{df}"
                            })

            folder_stats[folder]['total'] += 1
            folder_stats[folder]['duration'] += duration
            if status == 'passed':
                folder_stats[folder]['passed'] += 1
            else:
                folder_stats[folder]['failed'] += 1

            # Format clean title
            display_title = test_title
            if not display_title or display_title == 'test':
                display_title = os.path.basename(rel_dir).replace('_report', '')

            subfolder = get_subfolder_name(rel_dir, folder)

            rep_item = {
                'id': f"rep_{len(all_reports) + 1}",
                'folder': folder,
                'subfolder': subfolder,
                'rel_path': rel_dir,
                'name': os.path.basename(rel_dir),
                'spec_file': spec_file or rel_dir,
                'title': display_title,
                'status': status,
                'duration': round(duration / 1000.0, 2), # in seconds
                'startTime': start_time,
                'errors': errors,
                'screenshots': screenshot_files,
                'videos': video_files,
                'attachments': attachments_list,
                'steps': steps
            }
            all_reports.append(rep_item)

    overall_stats = {
        'total': len(all_reports),
        'passed': sum(f['passed'] for f in folder_stats.values()),
        'failed': sum(f['failed'] for f in folder_stats.values()),
        'duration': round(sum(f['duration'] for f in folder_stats.values()) / 1000.0, 2),
        'by_folder': folder_stats
    }

    manifest = {
        'stats': overall_stats,
        'reports': all_reports
    }

    # Ensure data directory exists
    os.makedirs(os.path.join(base_dir, 'data'), exist_ok=True)
    
    js_output_path = os.path.join(base_dir, 'data', 'master_data.js')
    with open(js_output_path, 'w', encoding='utf-8') as f:
        f.write("window.MASTER_DATA = ")
        json.dump(manifest, f, ensure_ascii=False)
        f.write(";\n")

    print(f"Generated {js_output_path}")
    print(f"Summary: Total {overall_stats['total']} reports ({overall_stats['passed']} passed, {overall_stats['failed']} failed)")
    for folder, st in folder_stats.items():
        print(f" - {folder}: {st['total']} total ({st['passed']} passed, {st['failed']} failed)")

if __name__ == '__main__':
    generate()
